import axios from "axios"
import Chat from "../models/Chat.js"
import User from "../models/User.js"
import imagekit from "../configs/imageKit.js"
import openai from '../configs/openai.js'
import redisClient from "../configs/redis.js"

const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};
// Text-based AI Chat Message Controller
export const textMessageController = async (req, res) => {
    try {
        const userId = req.user._id
        const io = req.app.get("io")

         // Check credits
        if(req.user.credits < 1){
            return res.json({success: false, message: "You don't have enough credits to use this feature"})
        }

        const {chatId, prompt, socketId} = req.body

        // Redis Active Chat Cache
        const chatCacheKey = `chat:${chatId}`;
        let chatStr = await redisClient.get(chatCacheKey);
        let chat;
        
        if (chatStr) {
            chat = JSON.parse(chatStr);
        } else {
            chat = await Chat.findOne({userId, _id: chatId}).lean();
            if (chat) await redisClient.setEx(chatCacheKey, 3600, JSON.stringify(chat));
        }

        if (!chat) return res.json({success: false, message: "Chat not found"});

        const cacheKey = `prompt:${prompt.trim().toLowerCase()}`;
        const cachedResponse = await redisClient.get(cacheKey);

        if (cachedResponse) {
            const userMsg = {role: "user", content: prompt, timestamp: Date.now(), isImage: false, embedding: []};
            
            res.json({success: true, isStreaming: true});
            const currentMessageId = Date.now();
            
            if (socketId) {
                // Short timeout to let UI settle
                setTimeout(async () => {
                   io.to(socketId).emit("message-chunk", { chunk: cachedResponse, messageId: currentMessageId });
                   const reply = { role: "assistant", content: cachedResponse, timestamp: Date.now(), isImage: false, embedding: [] };
                   
                   await Chat.updateOne({userId, _id: chatId}, {
                       $push: { messages: { $each: [userMsg, reply] } }
                   });
                   
                   // Update Active Chat Cache
                   chat.messages.push(userMsg, reply);
                   await redisClient.setEx(chatCacheKey, 3600, JSON.stringify(chat));
                   
                   await User.updateOne({_id: userId}, {$inc: {credits: -1}});
                   await redisClient.del(`user:${userId}`); // Clear user credit cache
                   io.to(socketId).emit("message-end", { messageId: currentMessageId, reply });
                }, 100);
            }
            return;
        }

        // Generate embedding for current prompt
        let promptEmbedding = [];
        try {
            const embedResponse = await openai.embeddings.create({
                model: "text-embedding-004",
                input: prompt,
            });
            promptEmbedding = embedResponse.data[0].embedding;
        } catch (e) {
            console.log("Embedding generation failed:", e.message);
        }

        const userMsg = {role: "user", content: prompt, timestamp: Date.now(), isImage: false, embedding: promptEmbedding};
        chat.messages.push(userMsg);

        res.json({success: true, isStreaming: true})

        // Semantic Search Context & Last N Messages (Send Only Recent Messages to AI)
        const N_MESSAGES = 5;
        const otherMessages = chat.messages.slice(0, -N_MESSAGES);
        let relevantMessages = [];
        
        if (promptEmbedding.length > 0 && otherMessages.length > 0) {
            const scored = otherMessages.map(msg => ({
                role: msg.role,
                content: msg.content,
                score: msg.embedding && msg.embedding.length > 0 ? cosineSimilarity(promptEmbedding, msg.embedding) : 0
            }));
            scored.sort((a, b) => b.score - a.score);
            relevantMessages = scored.filter(s => s.score > 0.4).slice(0, 3).map(s => ({
                role: s.role,
                content: s.content
            }));
        }

        const lastNMessages = chat.messages.slice(-N_MESSAGES).map(m => ({
            role: m.role,
            content: m.content
        }));

        const finalMessages = [];
        if (relevantMessages.length > 0) {
            finalMessages.push({
                role: "system",
                content: "Here is some potentially semantically relevant context from older messages: " + JSON.stringify(relevantMessages)
            });
        }
        finalMessages.push(...lastNMessages);

        const stream = await openai.chat.completions.create({
            model: "gemini-2.5-flash",
            messages: finalMessages,
            stream: true
        });

        let fullResponse = ""
        const currentMessageId = Date.now()

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ""
            fullResponse += content
            if (socketId) {
                io.to(socketId).emit("message-chunk", { chunk: content, messageId: currentMessageId })
            }
        }

        let replyEmbedding = [];
        try {
            const embedReply = await openai.embeddings.create({
                model: "text-embedding-004",
                input: fullResponse,
            });
            replyEmbedding = embedReply.data[0].embedding;
        } catch (e) {
            console.log("Embedding generation failed for reply:", e.message);
        }

        await redisClient.setEx(cacheKey, 86400 * 7, fullResponse); // Cache prompt for 7 days

        const reply = { role: "assistant", content: fullResponse, timestamp: Date.now(), isImage: false, embedding: replyEmbedding }
        await Chat.updateOne({userId, _id: chatId}, {
            $push: { messages: { $each: [userMsg, reply] } }
        });
        
        // Update Active Chat Cache
        chat.messages.push(reply);
        await redisClient.setEx(chatCacheKey, 3600, JSON.stringify(chat));
        
        await User.updateOne({_id: userId}, {$inc: {credits: -1}})
        await redisClient.del(`user:${userId}`); // Clear user credit cache

        if (socketId) {
            io.to(socketId).emit("message-end", { messageId: currentMessageId, reply })
        }

    } catch (error) {
        if (!res.headersSent) {
            res.json({success: false, message: error.message})
        }
    }
}

// Image Generation Message Controller
export const imageMessageController = async (req, res) => {
    try {
        const userId = req.user._id;
        // Check credits
        if(req.user.credits < 2){
            return res.json({success: false, message: "You don't have enough credits to use this feature"})
        }
        const {prompt, chatId, isPublished} = req.body
        
        // Redis Active Chat Cache
        const chatCacheKey = `chat:${chatId}`;
        let chatStr = await redisClient.get(chatCacheKey);
        let chat;
        
        if (chatStr) {
            chat = JSON.parse(chatStr);
        } else {
            chat = await Chat.findOne({userId, _id: chatId}).lean();
            if (chat) await redisClient.setEx(chatCacheKey, 3600, JSON.stringify(chat));
        }

        if (!chat) return res.json({success: false, message: "Chat not found"});

        const cacheKey = `img_prompt:${prompt.trim().toLowerCase()}`;
        const cachedImageUrl = await redisClient.get(cacheKey);

        if (cachedImageUrl) {
            const userMsg = { role: "user", content: prompt, timestamp: Date.now(), isImage: false };
            const reply = { role: 'assistant', content: cachedImageUrl, timestamp: Date.now(), isImage: true, isPublished };
            await Chat.updateOne({userId, _id: chatId}, {
                $push: { messages: { $each: [userMsg, reply] } }
            });
            
            // Update Active Chat Cache
            chat.messages.push(userMsg, reply);
            await redisClient.setEx(chatCacheKey, 3600, JSON.stringify(chat));
            
            await User.updateOne({_id: userId}, {$inc: {credits: -2}});
            await redisClient.del(`user:${userId}`); // Clear user credit cache
            return res.json({success: true, reply});
        }

         // Create user message object
         const userMsg = {
            role: "user", 
            content: prompt, 
            timestamp: Date.now(), 
            isImage: false
         };

        // Encode the prompt
        const encodedPrompt = encodeURIComponent(prompt)

        // Construct AI generation URL using Pollinations AI
        const generatedImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&nologo=true`;

        // Trigger generation by fetching from Pollinations AI
        const aiImageResponse = await axios.get(generatedImageUrl, {responseType: "arraybuffer"})

        // Convert to Base64
        const base64Image = `data:image/png;base64,${Buffer.from(aiImageResponse.data,"binary").toString('base64')}`;

        // Upload to ImageKit Media Library
        const uploadResponse = await imagekit.upload({
            file: base64Image,
            fileName: `${Date.now()}.png`,
            folder: "promptstack"
        })

        const reply = {
                role: 'assistant',
                content: uploadResponse.url,
                timestamp: Date.now(), 
                isImage: true,
                isPublished
        }

         await redisClient.setEx(cacheKey, 86400 * 30, uploadResponse.url); // Cache image for 30 days

         await Chat.updateOne({userId, _id: chatId}, {
             $push: { messages: { $each: [userMsg, reply] } }
         });

         // Update Active Chat Cache
         chat.messages.push(userMsg, reply);
         await redisClient.setEx(chatCacheKey, 3600, JSON.stringify(chat));

          await User.updateOne({_id: userId}, {$inc: {credits: -2}})
          await redisClient.del(`user:${userId}`); // Clear user credit cache

          res.json({success: true, reply})

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}