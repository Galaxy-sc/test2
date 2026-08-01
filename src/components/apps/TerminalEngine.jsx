import React, { useState, useEffect, useRef } from 'react';
import { APP_CONFIG } from '../../config';

const TerminalEngine = ({ startFlow }) => {
  const [history, setHistory] = useState([
    `<span class="text-[#ff2a5f] font-bold">root</span><span class="text-white">@</span><span class="text-[#4a7bfe] font-bold">owasp-crt</span>:~$ ./crt_provision.sh<br>`
  ]);
  const [termState, setTermState] = useState(0); 
  const [inputVal, setInputVal] = useState('');
  const [firstName, setFirstName] = useState('');
  const [fullName, setFullName] = useState('');
  const inputRef = useRef(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!startFlow || hasStarted.current) return;
    hasStarted.current = true;
    const t1 = setTimeout(() => setHistory(p => [...p, `<span class="text-slate-400">[+] Initializing secure identity provisioning...</span><br>`]), 600);
    const t2 = setTimeout(() => setHistory(p => [...p, `<span class="text-slate-400">[+] Connecting to OWASP verification matrix... OK</span><br><br>`]), 1200);
    const t3 = setTimeout(() => { setTermState(1); inputRef.current?.focus(); }, 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [startFlow]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    
    if (termState === 3) {
        setInputVal(val);
        return;
    }

    const isValidChar = /^[a-zA-Z\s\-]*$/.test(val);
    if (isValidChar) {
      setInputVal(val);
    }
  };

  const triggerWorkflow = async (token, name) => {
    setHistory(p => [...p, `<span class="text-slate-400">[*] Dispatching API request to GitHub Actions...</span><br>`]);
    
    try {
       const response = await fetch(`https://api.github.com/repos/${APP_CONFIG.github.owner}/${APP_CONFIG.github.repo}/actions/workflows/${APP_CONFIG.github.workflowId}/dispatches`, {
           method: "POST",
           headers: {
               "Accept": "application/vnd.github.v3+json",
               "Authorization": `Bearer ${token}`,
               "Content-Type": "application/json"
           },
           body: JSON.stringify({
               ref: "main",
               inputs: {
                   full_name: name
               }
           })
       });

       if (response.ok) {
           setHistory(p => [...p, `<span class="text-emerald-500">[✔] SUCCESS: Workflow triggered successfully!</span><br><span class="text-slate-400">Wait a few moments for the action to finish, then check the identity viewer.</span><br>`]);
       } else {
           const errData = await response.text();
           setHistory(p => [...p, `<span class="text-red-500">[!] ERROR: API Request Failed. Check your token permissions or workflow filename.</span><br><span class="text-slate-500">${errData}</span><br>`]);
       }
    } catch (err) {
        setHistory(p => [...p, `<span class="text-red-500">[!] NETWORK ERROR: ${err.message}</span><br>`]);
    }
    setTermState(4);
  };

  const handleInput = (e) => {
    if (e.key === 'Enter') {
      const val = inputVal.trim();
      if (!val) return;

      if (termState === 1) {
        setFirstName(val);
        setHistory(p => [...p, `<span style="color:#9d4edd;">Enter First Name: </span>${val}<br>`]);
        setTermState(2);
        setInputVal('');
      } else if (termState === 2) {
        const totalFullName = firstName + " " + val;
        
        if (totalFullName.length > 20) {
          setHistory(p => [
            ...p,
            `<span style="color:#9d4edd;">Enter Last Name: </span>${val}<br>`,
            `<span class="text-red-500">[!] Error: Full name exceeds the 20-character limit (${totalFullName.length}/20). Please restart provisioning with a shorter name.</span><br><br>`
          ]);
          setTermState(1);
          setFirstName('');
          setInputVal('');
          return;
        }
        
        setFullName(totalFullName);
        setHistory(p => [
          ...p, 
          `<span style="color:#9d4edd;">Enter Last Name: </span>${val}<br><br>`,
          `<span class="text-emerald-500">[ ] Identity parsed successfully.</span><br>`,
          `<span class="text-slate-400">[*] Authentication Required.</span><br>`
        ]);
        setTermState(3);
        setInputVal('');
      } else if (termState === 3) {
        const maskedToken = "*".repeat(Math.min(val.length, 12));
        setHistory(p => [
            ...p,
            `<span style="color:#9d4edd;">Enter GitHub PAT (Token): </span>${maskedToken}<br><br>`
        ]);
        setInputVal('');
        setTermState(4);
        triggerWorkflow(val, fullName);
      }
    }
  };

  const getCharCountText = () => {
    if (termState === 1) {
      return `[Chars: ${inputVal.length}/20]`;
    } else if (termState === 2) {
      const currentTotal = firstName.length + 1 + inputVal.length;
      return `[Total Chars: ${currentTotal}/20]`;
    }
    return '';
  };

  return (
    <div className="bg-transparent p-[15px] md:p-[20px] font-['Fira_Code',monospace] text-[12px] md:text-[13px] text-slate-200 h-full overflow-y-auto rounded-b-[9px] cursor-text flex flex-col leading-[1.6]" onClick={() => inputRef.current?.focus()}>
      <div id="term-output">
        {history.map((line, idx) => <span key={idx} dangerouslySetInnerHTML={{ __html: line }}></span>)}
      </div>
      
      {termState >= 1 && termState < 4 && (
        <div className="flex items-center mt-1.5 flex-wrap">
          <span id="term-prompt" className="text-[#9d4edd]">
            {termState === 1 ? "Enter First Name: " : termState === 2 ? "Enter Last Name: " : "Enter GitHub PAT (Token): "}
          </span>
          <input 
            type={termState === 3 ? "password" : "text"}
            ref={inputRef}
            className="bg-transparent border-none outline-none text-white font-['Fira_Code',monospace] text-[12px] md:text-[13px] flex-grow ml-2" 
            value={inputVal}
            onChange={handleInputChange}
            onKeyDown={handleInput}
            autoComplete="off"
          />
          <span className="text-slate-500 text-[11px] ml-2 font-mono">
            {getCharCountText()}
          </span>
        </div>
      )}
    </div>
  );
};

export default TerminalEngine;