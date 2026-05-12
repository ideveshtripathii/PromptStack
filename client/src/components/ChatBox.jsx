import React, { useEffect, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import Message from './Message'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'

const ChatBox = () => {

  const containerRef = useRef(null)

  const {selectedChat, theme, user, axios, token, setUser} = useAppContext()

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState('text')
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [socket, setSocket] = useState(null)
  
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const recognitionRef = useRef(null)
  const spokenTextRef = useRef('')
  const hasSpokenRef = useRef(false)
  const startPromptRef = useRef('')

  useEffect(() => {
    const s = io(import.meta.env.VITE_SERVER_URL);
    setSocket(s);
    return () => s.disconnect();
  }, [])

  useEffect(() => {
    if (!socket) return;

    const handleChunk = ({ chunk, messageId }) => {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.messageId === messageId) {
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
        } else {
          return [...prev, { role: 'assistant', content: chunk, messageId, isImage: false, timestamp: Date.now() }];
        }
      });
      setLoading(false);
    };

    const handleEnd = ({ messageId, reply }) => {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.messageId === messageId) {
          return [...prev.slice(0, -1), reply];
        }
        return prev;
      });
      setUser(prev => ({ ...prev, credits: prev.credits - 1 }));

      if (!reply.isImage && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        const cleanText = reply.content.replace(/[*#_]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    };

    socket.on('message-chunk', handleChunk);
    socket.on('message-end', handleEnd);

    return () => {
      socket.off('message-chunk', handleChunk);
      socket.off('message-end', handleEnd);
    }
  }, [socket, setUser]);

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return toast.error("Speech Recognition not supported in this browser.");

    hasSpokenRef.current = false;
    startPromptRef.current = prompt;
    
    // Auto-stop any current AI voice so the Mic can hear clearly
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false; // Auto-stop listening when the user pauses
    recognition.interimResults = true; // Show text as they speak

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let currentSessionTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
         currentSessionTranscript += event.results[i][0].transcript;
      }
      
      if (currentSessionTranscript.trim()) {
         hasSpokenRef.current = true;
         const combined = startPromptRef.current 
            ? startPromptRef.current + " " + currentSessionTranscript.trim()
            : currentSessionTranscript.trim();
         
         setPrompt(combined);
         spokenTextRef.current = combined;
      }
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      toast.error("Voice recognition error: " + event.error);
    };
    recognition.onend = () => {
      setIsListening(false);
      // Auto-submit when user stops talking manually or pauses for a long time
      if (hasSpokenRef.current && spokenTextRef.current.trim()) {
        sendMessage(spokenTextRef.current.trim());
        hasSpokenRef.current = false;
        spokenTextRef.current = '';
      }
    };
    recognition.start();
  };

  const stopVoice = () => {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const sendMessage = async (textToSubmit) => {
    if(!user) return toast('Login to send message')
    if(!textToSubmit || !textToSubmit.trim()) return

    // Warm up speech synthesis engine on user interaction to bypass browser blocks
    if (window.speechSynthesis) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    }

    setLoading(true)
    const promptCopy = textToSubmit
    setPrompt('')
    setMessages(prev => [...prev, {role: 'user', content: textToSubmit, timestamp: Date.now(), isImage: false }])

    try {
        const {data} = await axios.post(`/api/message/${mode}`, {chatId: selectedChat._id, prompt: textToSubmit, isPublished, socketId: socket?.id}, {headers: { Authorization: token }})

        if(data.success){
          if(data.isStreaming) {
             // The stream will handle updating the UI and reducing credits
          } else {
            setMessages(prev => [...prev, data.reply])
            // decrease credits
            if (mode === 'image'){
              setUser(prev => ({...prev, credits: prev.credits - 2}))
            }else{
              setUser(prev => ({...prev, credits: prev.credits - 1}))
            }
            setLoading(false)
          }
        }else{
          toast.error(data.message)
          setPrompt(promptCopy)
          setLoading(false)
        }
    } catch (error) {
      toast.error(error.message)
      setPrompt(promptCopy)
      setLoading(false)
    }
  }

  const onSubmit = (e) => {
    e.preventDefault() 
    sendMessage(prompt)
  }

  useEffect(()=>{
    if(selectedChat){
      setMessages(selectedChat.messages)
    }
  },[selectedChat])

  useEffect(()=>{
    if(containerRef.current){
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  },[messages])

  return (
    <div className='flex-1 flex flex-col w-full max-w-4xl mx-auto h-full px-4 md:px-8 pt-4 pb-6 max-md:pt-[70px] relative'>
      
      {/* Chat Messages */}
      <div ref={containerRef} className='flex-1 mb-5 overflow-y-auto scroll-smooth pr-2 custom-scrollbar'>
        {messages.length === 0 && (
          <div className='h-full flex flex-col items-center justify-center gap-2 text-primary'>
            <img src={theme === 'dark' ? assets.logo_full_dark : assets.logo_full} alt="PromptStack" className='w-full max-w-56 sm:max-w-68'/>
            <p className='mt-5 text-4xl sm:text-6xl text-center text-gray-400 dark:text-white'>Ask me anything.</p>
          </div>
        )}

        {messages.map((message, index)=> <Message key={index} message={message}/>)}

        {/* Three Dots Loading  */}
        {
          loading && <div className='loader flex  items-center gap-1.5'>
            <div className='w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-white animate-bounce'></div>
            <div className='w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-white animate-bounce'></div>
            <div className='w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-white animate-bounce'></div>
          </div>
        }
      </div>

        {mode === 'image' && (
          <label className='inline-flex items-center gap-2 mb-3 text-sm mx-auto'>
            <p className='text-xs'>Publish Generated Image to Community</p>
            <input type="checkbox" className='cursor-pointer' checked={isPublished} onChange={(e)=>setIsPublished(e.target.checked)}/>
          </label>
        )}

      <form onSubmit={onSubmit} className='bg-white/80 dark:bg-[#201C25]/90 backdrop-blur-xl border border-gray-200 dark:border-[#80609F]/40 shadow-xl rounded-full w-full p-2.5 pl-4 mx-auto flex gap-3 items-center focus-within:ring-2 focus-within:ring-purple-500/50 transition-all'>
        
        {/* Custom Mode Selector */}
        <div className='relative'>
          <button 
            type='button' 
            onClick={() => setShowModeDropdown(!showModeDropdown)}
            className='flex items-center gap-1.5 p-2 px-3 rounded-full hover:bg-gray-200 dark:hover:bg-[#583C79]/50 transition-colors text-sm font-medium text-gray-700 dark:text-gray-200'
          >
            {mode === 'text' ? (
              <svg className='w-4 h-4 text-purple-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M4 6h16M4 12h16m-7 6h7'></path></svg>
            ) : (
              <svg className='w-4 h-4 text-blue-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'></path></svg>
            )}
            <span className='hidden sm:block capitalize'>{mode}</span>
          </button>

          {/* Dropdown Menu */}
          {showModeDropdown && (
            <>
              <div className='fixed inset-0 z-10' onClick={() => setShowModeDropdown(false)}></div>
              <div className='absolute bottom-full left-0 mb-2 w-36 bg-white dark:bg-[#2A2433] border border-gray-200 dark:border-[#80609F]/40 shadow-xl rounded-xl z-20 overflow-hidden transform origin-bottom-left transition-all'>
                <div 
                  onClick={() => { setMode('text'); setShowModeDropdown(false); }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3E2D53] transition-colors ${mode === 'text' ? 'bg-purple-50 dark:bg-[#3E2D53]/50' : ''}`}
                >
                  <svg className='w-4 h-4 text-purple-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M4 6h16M4 12h16m-7 6h7'></path></svg>
                  <span className='text-sm text-gray-700 dark:text-gray-200 font-medium'>Text</span>
                </div>
                <div className='border-t border-gray-100 dark:border-gray-700/50'></div>
                <div 
                  onClick={() => { setMode('image'); setShowModeDropdown(false); }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3E2D53] transition-colors ${mode === 'image' ? 'bg-blue-50 dark:bg-[#3E2D53]/50' : ''}`}
                >
                  <svg className='w-4 h-4 text-blue-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'></path></svg>
                  <span className='text-sm text-gray-700 dark:text-gray-200 font-medium'>Image</span>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className='h-6 w-px bg-gray-300 dark:bg-gray-700 hidden sm:block'></div>

        <input onChange={(e)=>setPrompt(e.target.value)} value={prompt} type="text" placeholder="Message PromptStack..." className='flex-1 w-full text-[15px] outline-none dark:text-white bg-transparent leading-relaxed tracking-wide placeholder:text-gray-400 dark:placeholder:text-gray-500 ml-2' required/>
        
        {isSpeaking && (
           <button type="button" onClick={stopVoice} title="Stop Voice" className="text-red-500 hover:text-red-700 transition">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
           </button>
        )}
        
        <button type="button" onClick={toggleMic} className={`p-1.5 rounded-full transition ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-[#80609F]/50 dark:text-gray-300'}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
        </button>
        <button disabled={loading} className='shrink-0 transition-transform hover:scale-110 active:scale-95'>
          <img src={loading ? assets.stop_icon : assets.send_icon} className='w-8 lg:w-10 cursor-pointer' alt="" />
        </button>
      </form>
    </div>
  )
}

export default ChatBox
