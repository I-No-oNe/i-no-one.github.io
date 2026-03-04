'use strict';
const { jsPDF } = window.jspdf;
const { PDFDocument } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// State
let convertFiles = [], mergeFiles = [], splitFile = null, ocrFile = null;
let selectedLangs = new Set(['eng']);
let dragSrc = null;

// Utils
const fmt = b => b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB';
const fIcon = n => ({pdf:'📄',jpg:'🖼',jpeg:'🖼',png:'🖼',gif:'🖼',bmp:'🖼',tiff:'🖼',tif:'🖼',txt:'📝',doc:'📃',docx:'📃'}[n.split('.').pop().toLowerCase()]||'📁');

function showAlert(msg, type='success') {
    const el = document.getElementById('alert');
    el.textContent = msg; el.className = 'alert show '+type;
    clearTimeout(el._t); el._t = setTimeout(()=>el.className='alert',3800);
}
const showProc = (id, on) => document.getElementById(id).classList.toggle('show', on);

// Tabs
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); document.getElementById(b.dataset.tab).classList.add('active');
}));

// Preview
function showPreview(blob, name) {
    const url = URL.createObjectURL(blob);
    document.getElementById('previewFrame').innerHTML = `<iframe src="${url}#toolbar=1"></iframe>`;
    document.getElementById('previewInfo').textContent = name+' — '+fmt(blob.size);
    document.getElementById('statusDot').classList.add('loaded');
    const btn = document.getElementById('btnDownload');
    btn.style.display = 'inline-block';
    btn.onclick = () => { const a=document.createElement('a'); a.href=url; a.download=name; a.click(); };
}

// Drop zones
function makeDZ(zoneId, inputId, browseId, cb) {
    const z=document.getElementById(zoneId), inp=document.getElementById(inputId), lnk=document.getElementById(browseId);
    if(lnk) lnk.addEventListener('click', e=>{e.preventDefault();inp.click();});
    inp.addEventListener('change', ()=>cb([...inp.files]));
    z.addEventListener('dragover', e=>{e.preventDefault();z.classList.add('drag-over');});
    z.addEventListener('dragleave', ()=>z.classList.remove('drag-over'));
    z.addEventListener('drop', e=>{e.preventDefault();z.classList.remove('drag-over');cb([...e.dataTransfer.files]);});
    z.addEventListener('click', e=>{if(e.target!==lnk)inp.click();});
}

/* ── CONVERT ── */
function renderConvertList() {
    const list = document.getElementById('flConvert');
    list.innerHTML = '';
    convertFiles.forEach((f,i) => {
        const d=document.createElement('div'); d.className='file-item';
        d.innerHTML=`<span class="file-icon">${fIcon(f.name)}</span><span class="file-name">${f.name}</span><span class="file-meta">${fmt(f.size)}</span><button class="file-remove" data-i="${i}">✕</button>`;
        d.querySelector('.file-remove').addEventListener('click',()=>{convertFiles.splice(i,1);renderConvertList();});
        list.appendChild(d);
    });
    const n=convertFiles.length;
    document.getElementById('stConvert').style.display=n?'flex':'none';
    document.getElementById('cnConvert').textContent=n;
    document.getElementById('szConvert').textContent=fmt(convertFiles.reduce((a,f)=>a+f.size,0));
    document.getElementById('btnConvert').disabled=!n;
    document.getElementById('btnClearConvert').disabled=!n;
}
makeDZ('dzConvert','fiConvert','brConvert', files=>{convertFiles.push(...files);renderConvertList();});
document.getElementById('btnClearConvert').addEventListener('click',()=>{convertFiles=[];renderConvertList();});
document.getElementById('btnConvert').addEventListener('click', async ()=>{
    if(!convertFiles.length) return;
    showProc('procConvert',true); document.getElementById('btnConvert').disabled=true;
    try {
        const doc=new jsPDF({orientation:document.getElementById('orConvert').value,unit:'mm',format:document.getElementById('psConvert').value});
        let first=true;
        for(const file of convertFiles){
            const ext=file.name.split('.').pop().toLowerCase();
            if(!first) doc.addPage(document.getElementById('psConvert').value,document.getElementById('orConvert').value);
            first=false;
            if(['jpg','jpeg','png','gif'].includes(ext)){
                await new Promise((res,rej)=>{
                    const r=new FileReader(); r.onload=e=>{
                        const img=new Image(); img.onload=()=>{
                            const pw=doc.internal.pageSize.getWidth(),ph=doc.internal.pageSize.getHeight();
                            const ratio=Math.min(pw/img.width,ph/img.height);
                            doc.addImage(e.target.result,ext==='png'?'PNG':'JPEG',(pw-img.width*ratio)/2,(ph-img.height*ratio)/2,img.width*ratio,img.height*ratio,undefined,'FAST');
                            res();
                        }; img.onerror=rej; img.src=e.target.result;
                    }; r.onerror=rej; r.readAsDataURL(file);
                });
            } else if(ext==='txt'){
                const text=await file.text(); doc.setFontSize(11);
                doc.text(doc.splitTextToSize(text,doc.internal.pageSize.getWidth()-20),10,15);
            } else if(['doc','docx'].includes(ext)){
                const r=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()}); doc.setFontSize(11);
                doc.text(doc.splitTextToSize(r.value,doc.internal.pageSize.getWidth()-20),10,15);
            }
        }
        showPreview(doc.output('blob'),'converted.pdf');
        showAlert(`Converted ${convertFiles.length} file(s) successfully!`);
    } catch(e){showAlert('Conversion failed: '+e.message,'error');}
    finally{showProc('procConvert',false);document.getElementById('btnConvert').disabled=false;}
});

/* ── MERGE ── */
async function getPageCount(f){try{const p=await PDFDocument.load(await f.arrayBuffer(),{ignoreEncryption:true});return p.getPageCount();}catch{return'?';}}
async function renderMergeList(){
    const list=document.getElementById('flMerge'); list.innerHTML=''; let tp=0;
    for(const[i,f] of mergeFiles.entries()){
        const pages=await getPageCount(f); if(typeof pages==='number') tp+=pages;
        const item=document.createElement('div'); item.className='file-item'; item.draggable=true; item.dataset.i=i;
        item.innerHTML=`<span class="file-icon">📄</span><span class="file-name">${f.name}</span><span class="file-pages">${pages}p</span><span class="file-meta">${fmt(f.size)}</span><button class="file-remove" data-i="${i}">✕</button>`;
        item.addEventListener('dragstart',()=>{dragSrc=i;item.classList.add('dragging');});
        item.addEventListener('dragend',()=>item.classList.remove('dragging'));
        item.addEventListener('dragover',e=>{e.preventDefault();item.classList.add('drag-target');});
        item.addEventListener('dragleave',()=>item.classList.remove('drag-target'));
        item.addEventListener('drop',e=>{e.preventDefault();item.classList.remove('drag-target');if(dragSrc===null||dragSrc===i)return;mergeFiles.splice(i,0,mergeFiles.splice(dragSrc,1)[0]);renderMergeList();});
        item.querySelector('.file-remove').addEventListener('click',()=>{mergeFiles.splice(i,1);renderMergeList();});
        list.appendChild(item);
    }
    const n=mergeFiles.length;
    document.getElementById('stMerge').style.display=n?'flex':'none';
    document.getElementById('cnMerge').textContent=n;
    document.getElementById('pgMerge').textContent=tp||'—';
    document.getElementById('szMerge').textContent=fmt(mergeFiles.reduce((a,f)=>a+f.size,0));
    document.getElementById('btnMerge').disabled=n<2;
    document.getElementById('btnClearMerge').disabled=!n;
}
makeDZ('dzMerge','fiMerge','brMerge',files=>{mergeFiles.push(...files.filter(f=>f.type==='application/pdf'||f.name.endsWith('.pdf')));renderMergeList();});
document.getElementById('btnClearMerge').addEventListener('click',()=>{mergeFiles=[];renderMergeList();});
document.getElementById('btnMerge').addEventListener('click',async()=>{
    if(mergeFiles.length<2)return;
    showProc('procMerge',true); document.getElementById('btnMerge').disabled=true;
    try{
        const merged=await PDFDocument.create();
        for(const f of mergeFiles){const src=await PDFDocument.load(await f.arrayBuffer(),{ignoreEncryption:true});(await merged.copyPages(src,src.getPageIndices())).forEach(p=>merged.addPage(p));}
        showPreview(new Blob([await merged.save()],{type:'application/pdf'}),'merged.pdf');
        showAlert(`Merged ${mergeFiles.length} PDFs!`);
    }catch(e){showAlert('Merge failed: '+e.message,'error');}
    finally{showProc('procMerge',false);document.getElementById('btnMerge').disabled=mergeFiles.length<2;}
});

/* ── HTML ── */
document.getElementById('btnClearHtml').addEventListener('click',()=>document.getElementById('htmlInput').value='');
document.getElementById('btnHtmlPdf').addEventListener('click',async()=>{
    const html=document.getElementById('htmlInput').value.trim();
    if(!html){showAlert('Paste some HTML first.','error');return;}
    showProc('procHtml',true); document.getElementById('btnHtmlPdf').disabled=true;
    try{
        const c=document.createElement('div'); c.innerHTML=html; document.body.appendChild(c);
        const blob=await html2pdf().set({margin:+document.getElementById('mgHtml').value||10,filename:'html-export.pdf',image:{type:'jpeg',quality:.9},html2canvas:{scale:2,useCORS:true},jsPDF:{unit:'mm',format:document.getElementById('psHtml').value,orientation:document.getElementById('orHtml').value}}).from(c).outputPdf('blob');
        document.body.removeChild(c);
        showPreview(blob,'html-export.pdf'); showAlert('HTML converted!');
    }catch(e){showAlert('HTML failed: '+e.message,'error');}
    finally{showProc('procHtml',false);document.getElementById('btnHtmlPdf').disabled=false;}
});

/* ── SPLIT ── */
makeDZ('dzSplit','fiSplit','brSplit',files=>{
    const f=files.find(f=>f.type==='application/pdf'||f.name.endsWith('.pdf'));
    if(!f){showAlert('Please select a PDF.','error');return;}
    splitFile=f; document.getElementById('splitControls').style.display='flex'; document.getElementById('btnSplit').disabled=false;
    showAlert(`Loaded: ${f.name}`);
});
document.getElementById('splitMethod').addEventListener('change',function(){
    document.getElementById('rangeInput').style.display=this.value==='range'?'flex':'none';
    document.getElementById('pagesInput').style.display=this.value==='pages'?'flex':'none';
    document.getElementById('everyInput').style.display=this.value==='every'?'flex':'none';
});
document.getElementById('btnSplit').addEventListener('click',async()=>{
    if(!splitFile)return;
    showProc('procSplit',true); document.getElementById('btnSplit').disabled=true;
    try{
        const src=await PDFDocument.load(await splitFile.arrayBuffer(),{ignoreEncryption:true});
        const total=src.getPageCount(), method=document.getElementById('splitMethod').value;
        let groups=[];
        if(method==='range'){
            let idxs=[];
            document.getElementById('pageRange').value.split(',').map(s=>s.trim()).forEach(p=>{
                if(p.includes('-')){const[a,b]=p.split('-').map(Number);for(let i=a;i<=Math.min(b,total);i++)idxs.push(i-1);}
                else{const n=+p;if(n>=1&&n<=total)idxs.push(n-1);}
            });
            groups=[idxs];
        } else if(method==='pages'){
            groups=[document.getElementById('specificPages').value.split(',').map(s=>+s.trim()-1).filter(i=>i>=0&&i<total)];
        } else {
            const n=+document.getElementById('everyPages').value||5;
            for(let i=0;i<total;i+=n){const g=[];for(let j=i;j<Math.min(i+n,total);j++)g.push(j);groups.push(g);}
        }
        if(groups.length===1){
            const np=await PDFDocument.create();(await np.copyPages(src,groups[0])).forEach(p=>np.addPage(p));
            showPreview(new Blob([await np.save()],{type:'application/pdf'}),'split-output.pdf');
            showAlert(`Extracted ${groups[0].length} page(s)!`);
        } else {
            for(let gi=0;gi<groups.length;gi++){
                const np=await PDFDocument.create();(await np.copyPages(src,groups[gi])).forEach(p=>np.addPage(p));
                const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([await np.save()],{type:'application/pdf'})); a.download=`split-part-${gi+1}.pdf`; a.click();
            }
            showAlert(`Split into ${groups.length} files — check downloads!`);
        }
    }catch(e){showAlert('Split failed: '+e.message,'error');}
    finally{showProc('procSplit',false);document.getElementById('btnSplit').disabled=false;}
});

/* ═══════════════════════════════════
   OCR
═══════════════════════════════════ */
const LANGS = [
    {c:'eng',l:'English'},{c:'heb',l:'Hebrew'},{c:'ara',l:'Arabic'},
    {c:'fra',l:'French'},{c:'deu',l:'German'},{c:'spa',l:'Spanish'},
    {c:'por',l:'Portuguese'},{c:'ita',l:'Italian'},{c:'rus',l:'Russian'},
    {c:'chi_sim',l:'Chinese (S)'},{c:'chi_tra',l:'Chinese (T)'},{c:'jpn',l:'Japanese'},
    {c:'kor',l:'Korean'},{c:'hin',l:'Hindi'},{c:'tur',l:'Turkish'},{c:'nld',l:'Dutch'},
];

const langGrid = document.getElementById('langGrid');
LANGS.forEach(({c,l})=>{
    const chip=document.createElement('label');
    chip.className='lang-chip'+(selectedLangs.has(c)?' sel':'');
    chip.innerHTML=`<input type="checkbox" value="${c}" ${selectedLangs.has(c)?'checked':''}><span class="lang-dot"></span>${l}`;
    chip.addEventListener('click',e=>{
        e.preventDefault();
        const cb=chip.querySelector('input');
        if(selectedLangs.has(c)){selectedLangs.delete(c);chip.classList.remove('sel');cb.checked=false;}
        else{selectedLangs.add(c);chip.classList.add('sel');cb.checked=true;}
        if(selectedLangs.size===0){selectedLangs.add('eng');chip.classList.add('sel');cb.checked=true;}
    });
    langGrid.appendChild(chip);
});

makeDZ('dzOcr','fiOcr','brOcr',files=>{
    const f=files[0]; if(!f)return;
    ocrFile=f; document.getElementById('btnOcr').disabled=false;
    showAlert(`Loaded for OCR: ${f.name} (${fmt(f.size)})`);
});

function setOcrStatus(msg){document.getElementById('ocrStatus').textContent=msg;}
function setProgress(pct){
    document.getElementById('ocrProgWrap').classList.add('show');
    document.getElementById('ocrProg').style.width=Math.round(pct)+'%';
}

function parsePages(spec, total){
    if(!spec||spec.trim().toLowerCase()==='all') return Array.from({length:total},(_,i)=>i);
    const idxs=[];
    spec.split(',').map(s=>s.trim()).forEach(p=>{
        if(p.includes('-')){const[a,b]=p.split('-').map(Number);for(let i=a;i<=Math.min(b,total);i++)idxs.push(i-1);}
        else{const n=+p;if(n>=1&&n<=total)idxs.push(n-1);}
    });
    return[...new Set(idxs)].sort((a,b)=>a-b);
}

async function pdfPageToBlob(pdfjs, pageIdx, scale){
    const page=await pdfjs.getPage(pageIdx+1);
    const vp=page.getViewport({scale});
    const canvas=document.createElement('canvas');
    canvas.width=Math.round(vp.width); canvas.height=Math.round(vp.height);
    await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
    return new Promise(res=>canvas.toBlob(res,'image/png'));
}

document.getElementById('btnOcrClear').addEventListener('click',()=>{
    ocrFile=null; document.getElementById('btnOcr').disabled=true;
    document.getElementById('ocrText').value='';
    document.getElementById('ocrOutputWrap').style.display='none';
    document.getElementById('ocrStatus').textContent='';
    document.getElementById('ocrProgWrap').classList.remove('show');
    document.getElementById('ocrProg').style.width='0%';
    document.getElementById('fiOcr').value='';
    showAlert('OCR cleared.');
});

document.getElementById('btnOcr').addEventListener('click',async()=>{
    if(!ocrFile)return;
    document.getElementById('btnOcr').disabled=true;
    document.getElementById('ocrOutputWrap').style.display='none';
    showProc('procOcr',true);
    document.getElementById('procOcrLabel').textContent='Preparing…';
    setProgress(0); setOcrStatus('');

    try{
        const langs=[...selectedLangs].join('+');
        const scale=+document.getElementById('ocrScale').value||3;
        const fmt2=document.getElementById('ocrFmt').value;
        const psm=document.getElementById('ocrPSM').value;
        const isPdf=ocrFile.type==='application/pdf'||ocrFile.name.toLowerCase().endsWith('.pdf');
        let blobs=[];

        if(isPdf){
            document.getElementById('procOcrLabel').textContent='Loading PDF…';
            const pdfjs=await pdfjsLib.getDocument({data:new Uint8Array(await ocrFile.arrayBuffer())}).promise;
            const total=pdfjs.numPages;
            const pages=parsePages(document.getElementById('ocrPages').value,total);
            setOcrStatus(`Rendering ${pages.length} of ${total} page(s)…`);
            for(let pi=0;pi<pages.length;pi++){
                document.getElementById('procOcrLabel').textContent=`Rendering page ${pi+1}/${pages.length}…`;
                setProgress((pi/pages.length)*28);
                blobs.push(await pdfPageToBlob(pdfjs,pages[pi],scale));
            }
        } else {
            blobs=[ocrFile];
        }

        document.getElementById('procOcrLabel').textContent='Loading Tesseract…';
        setProgress(30);

        const worker=await Tesseract.createWorker(langs,1,{
            logger:m=>{
                if(m.status==='recognizing text'){
                    document.getElementById('procOcrLabel').textContent=`OCR… ${Math.round(m.progress*100)}%`;
                }
            }
        });
        await worker.setParameters({'tessedit_pageseg_mode': psm});

        let fullText='', totalConf=0;
        for(let bi=0;bi<blobs.length;bi++){
            setProgress(30+(bi/blobs.length)*68);
            document.getElementById('procOcrLabel').textContent=`OCR page ${bi+1}/${blobs.length}…`;
            const res=await worker.recognize(blobs[bi]);
            if(fmt2==='hocr'){fullText+=res.data.hocr+'\n\n';}
            else{fullText+=(blobs.length>1?`\n\n────── Page ${bi+1} ──────\n\n`:'')+res.data.text;}
            totalConf+=res.data.confidence;
        }
        await worker.terminate();

        setProgress(100);
        const avgConf=Math.round(totalConf/blobs.length);
        const words=fullText.trim().split(/\s+/).filter(Boolean).length;

        document.getElementById('ocrText').value=fullText.trim();
        document.getElementById('ocrWords').innerHTML=`<strong>${words.toLocaleString()}</strong>&nbsp;words`;
        const badge=document.getElementById('ocrConf');
        badge.textContent=`${avgConf}% confidence`;
        badge.className='conf-badge '+(avgConf>80?'high':avgConf>50?'med':'low');
        document.getElementById('ocrOutputWrap').style.display='block';
        setOcrStatus(`✓ ${blobs.length} page(s) · ${words.toLocaleString()} words · ${avgConf}% avg confidence`);
        showAlert(`OCR complete! ${words.toLocaleString()} words extracted.`);

    }catch(e){
        showAlert('OCR failed: '+e.message,'error');
        setOcrStatus('Error: '+e.message);
    }finally{
        showProc('procOcr',false);
        document.getElementById('btnOcr').disabled=!ocrFile;
    }
});

document.getElementById('btnOcrCopy').addEventListener('click',()=>{
    const t=document.getElementById('ocrText').value; if(!t)return;
    navigator.clipboard.writeText(t).then(()=>showAlert('Copied!')).catch(()=>{document.getElementById('ocrText').select();document.execCommand('copy');showAlert('Copied!');});
});

document.getElementById('btnOcrTxt').addEventListener('click',()=>{
    const t=document.getElementById('ocrText').value; if(!t)return;
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([t],{type:'text/plain'}));
    a.download=(ocrFile?ocrFile.name.replace(/\.[^.]+$/,''):'ocr-output')+'.txt';
    a.click();
});