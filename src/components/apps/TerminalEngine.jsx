import React, { useState, useEffect, useRef } from 'react';
import { APP_CONFIG } from '../../config';

const TerminalEngine = ({ startFlow }) => {
  const [history, setHistory] = useState([]);
  const [termState, setTermState] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [firstName, setFirstName] = useState('');
  const inputRef = useRef(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const user = params.get('user');
    const stateParam = params.get('state');

    if (status) {
      hasStarted.current = true;
      const isValidUser = user && /^[a-zA-Z0-9-]{1,39}$/.test(user);
      const savedNonce = sessionStorage.getItem('oauth_nonce');
      let isStateValid = false;

      try {
        if (stateParam && savedNonce) {
          const decodedState = JSON.parse(atob(stateParam));
          if (decodedState.nonce === savedNonce) {
            isStateValid = true;
          }
        }
      } catch (e) {
        isStateValid = false;
      }

      if (status === 'success' && isValidUser && isStateValid) {
        sessionStorage.removeItem('oauth_nonce');
        setTermState(5);
        pollForCertificate(user);
      } else {
        sessionStorage.removeItem('oauth_nonce');
        setHistory([
          <span key="err1" className="text-red-500 block mb-1">[!] ERROR: Authentication failed, CSRF token mismatch, or malformed data detected.</span>,
          <span key="err2" className="text-slate-400 block mb-4">Please execute CRT_Gen.sh to restart the process.</span>
        ]);
      }
      return;
    }

    if (!startFlow) return;
    hasStarted.current = true;
    setHistory([
      <span key="init1" className="block mb-1">
        <span className="text-[#ff2a5f] font-bold">root</span><span className="text-white">@</span><span className="text-[#4a7bfe] font-bold">owasp-crt</span>:~$ ./crt_provision.sh
      </span>
    ]);
    const t1 = setTimeout(() => setHistory(p => [...p, <span key="init2" className="text-slate-400 block mb-1">[+] Initializing secure identity provisioning...</span>]), 600);
    const t2 = setTimeout(() => setHistory(p => [...p, <span key="init3" className="text-slate-400 block mb-4">[+] Connecting to OWASP verification matrix... OK</span>]), 1200);
    const t3 = setTimeout(() => { setTermState(1); inputRef.current?.focus(); }, 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [startFlow]);

  const pollForCertificate = async (username) => {
    setHistory(p => [
      ...p,
      <span key={`poll1-${Date.now()}`} className="block mb-1">
        <span className="text-[#ff2a5f] font-bold">root</span><span className="text-white">@</span><span className="text-[#4a7bfe] font-bold">owasp-crt</span>:~$ ./crt_provision.sh --resume
      </span>,
      <span key={`poll2-${Date.now()}`} className="text-emerald-500 block mb-1">[ ] GitHub OAuth Authentication Successful.</span>,
      <span key={`poll3-${Date.now()}`} className="text-slate-400 block mb-1">[*] Resolving GitHub Identity for @{username}...</span>
    ]);

    try {
      const userRes = await fetch(`https://api.github.com/users/${username}`);
      if (!userRes.ok) throw new Error("Failed to fetch user ID");
      const userData = await userRes.json();
      const userId = userData.id;

      setHistory(p => [
        ...p,
        <span key={`poll4-${Date.now()}`} className="text-slate-400 block mb-1">[*] Identity resolved (ID securely hashed in background).</span>,
        <span key={`poll5-${Date.now()}`} className="text-slate-400 block mb-1">[*] Awaiting GitHub Actions background compilation... (This may take 30-60 seconds)</span>
      ]);

      const certUrl = `https://raw.githubusercontent.com/${APP_CONFIG.github.owner}/${APP_CONFIG.github.repo}/${APP_CONFIG.github.branch}/certs/${userId}.json`;

      let attempts = 0;
      const maxAttempts = 24;

      const checkCert = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch(`${certUrl}?t=${new Date().getTime()}`);
          if (res.ok) {
            clearInterval(checkCert);
            setHistory(p => [
              ...p,
              <span key={`succ1-${Date.now()}`} className="text-emerald-500 block mt-2 mb-1">[ ] MATRIX GENERATED SUCCESSFULLY!</span>,
              <span key={`succ2-${Date.now()}`} className="text-[#9d4edd] block mb-1">[*] Redirecting to Identity Viewer...</span>
            ]);
            setTimeout(() => {
              window.location.href = `?id=${userId}`;
            }, 2000);
          } else if (attempts >= maxAttempts) {
            clearInterval(checkCert);
            setHistory(p => [
              ...p,
              <span key={`tout1-${Date.now()}`} className="text-red-500 block mt-2 mb-1">[!] TIMEOUT: Certificate generation took too long.</span>,
              <span key={`tout2-${Date.now()}`} className="text-slate-400 block mb-1">Please check the repository Actions tab or try viewing your certificate manually later.</span>
            ]);
          } else if (attempts % 3 === 0) {
            setHistory(p => [...p, <span key={`wait-${attempts}`} className="text-slate-500 block mb-1">... still processing (attempt {attempts}/{maxAttempts})</span>]);
          }
        } catch (err) {
          console.error(err);
        }
      }, 5000);
    } catch (err) {
      setHistory(p => [...p, <span key={`err-${Date.now()}`} className="text-red-500 block mb-1">[!] ERROR: {err.message}</span>]);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    const isValidChar = /^[a-zA-Z\s\-]*$/.test(val);
    if (isValidChar) {
      setInputVal(val);
    }
  };

  const handleInput = (e) => {
    if (e.key === 'Enter') {
      const val = inputVal.trim();
      if (!val) return;

      if (termState === 1) {
        setFirstName(val);
        setHistory(p => [...p, <span key={`in1-${Date.now()}`} className="block mb-1"><span style={{color: '#9d4edd'}}>Enter First Name: </span>{val}</span>]);
        setTermState(2);
        setInputVal('');
      } else if (termState === 2) {
        const totalFullName = firstName + " " + val;

        if (totalFullName.length > 20) {
          setHistory(p => [
            ...p,
            <span key={`in2-${Date.now()}`} className="block mb-1"><span style={{color: '#9d4edd'}}>Enter Last Name: </span>{val}</span>,
            <span key={`errLimit-${Date.now()}`} className="text-red-500 block mb-4">[!] Error: Full name exceeds the 20-character limit ({totalFullName.length}/20). Please restart provisioning.</span>
          ]);
          setTermState(1);
          setFirstName('');
          setInputVal('');
          return;
        }

        setHistory(p => [
          ...p,
          <span key={`in3-${Date.now()}`} className="block mb-4"><span style={{color: '#9d4edd'}}>Enter Last Name: </span>{val}</span>,
          <span key={`ok1-${Date.now()}`} className="text-emerald-500 block mb-1">[ ] Identity syntax verified.</span>,
          <span key={`ok2-${Date.now()}`} className="text-slate-400 block mb-1">[*] Generating cryptographic payload...</span>
        ]);

        setTermState(3);
        setInputVal('');

        const clientId = "Ov23livHzCrr6Kgc5ZIO";
        const nonce = crypto.randomUUID();
        sessionStorage.setItem('oauth_nonce', nonce);

        const statePayload = btoa(JSON.stringify({ name: totalFullName, nonce: nonce }));
        const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user&state=${statePayload}`;

        setTimeout(() => {
          setHistory(p => [
            ...p,
            <span key={`auth1-${Date.now()}`} className="text-slate-400 block mb-4">[*] Secure authentication required.</span>,
            <a key={`authLink-${Date.now()}`} href={oauthUrl} className="mb-4 inline-flex items-center gap-2.5 px-4 py-2 bg-[rgba(157,78,221,0.08)] border border-[#9d4edd] text-[#9d4edd] hover:bg-[#9d4edd] hover:text-white hover:shadow-[0_0_15px_rgba(157,78,221,0.5)] transition-all duration-300 rounded-[6px] font-bold tracking-widest no-underline group cursor-pointer">
              <svg className="w-5 h-5 fill-current transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              AUTHENTICATE WITH GITHUB
            </a>,
            <span key={`auth2-${Date.now()}`} className="text-slate-500 block mb-1">Waiting for user action...</span>
          ]);
        }, 1500);
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
        {history.map((LineElement) => LineElement)}
      </div>
      {termState >= 1 && termState < 3 && (
        <div className="flex items-center mt-1.5 flex-wrap">
          <span id="term-prompt" className="text-[#9d4edd]">
            {termState === 1 ? "Enter First Name: " : "Enter Last Name: "}
          </span>
          <input
            type="text"
            ref={inputRef}
            className="bg-transparent border-none outline-none text-white font-['Fira_Code',monospace] text-[12px] md:text-[13px] flex-grow ml-2"
            value={inputVal}
            onChange={handleInputChange}
            onKeyDown={handleInput}
            autoComplete="off"
            spellCheck="false"
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