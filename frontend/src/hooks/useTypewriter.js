import { useState, useEffect, useRef } from 'react';

const useTypewriter = (text, speed = 50, startTyping = true) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!text || !startTyping) {
            setDisplayedText('');
            setIsTyping(false);
            setIsComplete(false);
            return;
        }

        setIsTyping(true);
        setIsComplete(false);
        setDisplayedText('');

        let index = 0;
        timerRef.current = setInterval(() => {
            if (index < text.length) {
                setDisplayedText(text.slice(0, index + 1));
                index++;
            } else {
                setIsTyping(false);
                setIsComplete(true);
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            }
        }, speed);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [text, speed, startTyping]);

    const skipToEnd = () => {
        console.log('skipToEnd called, isTyping:', isTyping, 'text length:', text?.length);
        if (isTyping && text) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setDisplayedText(text);
            setIsTyping(false);
            setIsComplete(true);
            console.log('skipToEnd executed, set displayedText to full text');
        }
    };

    return {
        displayedText,
        isTyping,
        isComplete,
        skipToEnd
    };
};

export default useTypewriter;
