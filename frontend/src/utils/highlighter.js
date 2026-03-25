// src/utils/highlighter.js

export const highlight = (text, lang = "python") => {
  if (!text) return '';
  let s = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const tok = {}; let c = 0;
  
  const save = (html, cls) => { 
    const id=`__T${c++}__`; 
    tok[id]=`<span class="${cls}">${html}</span>`; 
    return id; 
  };
  
  const flush = (str) => {
    let r = str, prev;
    do { 
      prev = r; 
      for(const [id,html] of Object.entries(tok)) r = r.replaceAll(id,html); 
    } while(r !== prev);
    return r;
  };

  if (lang === "bash") {
    s = s.replace(/(#[^\n]*)/g, m => save(m,'theme-text-sm-cls italic'));
    s = s.replace(/\b(echo|cd|ls|mkdir|rm|cp|mv|cat|grep|find|sudo|apt|pip|git|docker|systemctl|chmod|chown|export|source|if|then|fi|for|do|done|while|case|esac|function|return|exit)\b/g, m => save(m,'text-pink-400 font-bold'));
    s = s.replace(/(\$\w+|\$\{[^}]+\})/g, m => save(m,'text-yellow-300'));
    s = s.replace(/(".*?"|'.*?')/g, m => save(m,'text-green-400'));
    s = s.replace(/\b(\d+)\b/g, m => save(m,'text-orange-300'));
    return flush(s);
  }

  if (lang === "html") {
    s = s.replace(/()/g, m => save(m,'theme-text-sm-cls italic'));
    s = s.replace(/(&lt;\/?)([\w-]+)/g, (_, lt, tag) => lt + save(tag,'text-pink-400 font-bold'));
    s = s.replace(/([\w-]+)(=)/g, (_, attr, eq) => save(attr,'text-blue-300') + eq);
    s = s.replace(/(".*?"|'.*?')/g, m => save(m,'text-green-400'));
    return flush(s);
  }

  if (lang === "css") {
    s = s.replace(/(\/\*[\s\S]*?\*\/)/g, m => save(m,'theme-text-sm-cls italic'));
    s = s.replace(/([.#]?[\w-]+)(?=\s*\{)/g, m => save(m,'text-yellow-300 font-bold'));
    s = s.replace(/([\w-]+)(?=\s*:)/g, m => save(m,'text-blue-300'));
    s = s.replace(/(".*?"|'.*?'|#[0-9a-fA-F]{3,6}|\d+(?:px|em|rem|%|vh|vw)?)/g, m => save(m,'text-green-400'));
    return flush(s);
  }

  if (lang === "vbs" || lang === "vbscript") {
    // 1. Řetězce MUSÍ BÝT PRVNÍ
    s = s.replace(/(&quot;[\s\S]*?&quot;|"[^"]*")/g, m => save(m, 'text-green-400'));
    
    // 2. Komentáře (začínají apostrofem nebo slovem REM)
    s = s.replace(/(?:'|&#39;|REM\b)[^\n]*/gi, m => save(m, 'theme-text-sm-cls italic'));
    
    // 3. VBScript a DIAdem klíčová slova
    // Používáme nativní RegExp objekty bez dynamického skládání přes stringy, což se Vite líbí mnohem více.
    s = s.replace(/\b(Dim|Set|If|Then|Else|ElseIf|End|For|To|Step|Next|Do|While|Loop|Wend|Sub|Function|Call|Const|Exit|Resume|MsgBox|InputBox|Is|Nothing|And|Or|Not|True|False|vbCritical|vbInformation|vbExclamation|vbCrLf)\b/gi, m => save(m, 'text-pink-400 font-bold'));
    
    // Slova s mezerou musíme řešit zvlášť, aby to regex bezpečně sežral
    s = s.replace(/\b(Option\s+Explicit|On\s+Error)\b/gi, m => save(m, 'text-pink-400 font-bold'));
    
    // 4. DIAdem objekty
    s = s.replace(/\b(Data|View|Report|Navigator|Root|ChannelGroups|Channels|Properties|GetAverage|GetMaximum|GetMinimum|GetNumberOfPoints|SetAttribute|Exists)\b/gi, m => save(m, 'text-blue-400 font-bold'));
    
    // 5. Názvy volaných funkcí
    s = s.replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, m => save(m, 'text-blue-300'));
    
    // 6. Čísla
    s = s.replace(/\b(\d+(\.\d+)?)\b/g, m => save(m, 'text-orange-300'));
    
    return flush(s);
  }

  // Python (default)
  s = s.replace(/(&quot;[\s\S]*?&quot;|&#39;[\s\S]*?&#39;|"[^"]*"|'[^']*')/g, m => save(m,'text-green-400'));
  s = s.replace(/(#[^\n]*)/g, m => save(m,'theme-text-sm-cls italic'));
  s = s.replace(/\b(def|class)\s+([a-zA-Z_]\w*)/g, (_,p1,p2) => save(p1,'text-pink-400 font-bold')+' '+save(p2,'text-blue-400 font-bold'));
  s = s.replace(/\b(import|from|return|if|else|elif|for|while|try|except|finally|with|as|pass|break|continue|yield|lambda|global|nonlocal|assert|del|async|await|True|False|None|and|or|not|in|is)\b/g, m => save(m,'text-pink-400 font-bold'));
  s = s.replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, m => save(m,'text-blue-300'));
  s = s.replace(/\b(\d+(\.\d+)?)\b/g, m => save(m,'text-orange-300'));
  return flush(s);
};