'use client';
import {useEffect,useRef} from 'react';

export default function DialogBehavior({onClose}){
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  const dialog=[...document.querySelectorAll('[role="dialog"]')].at(-1);
  if(!dialog)return;
  const previous=document.activeElement,overflow=document.body.style.overflow;
  const selector='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]';
  const items=()=>[...dialog.querySelectorAll(selector)].filter(e=>e.getClientRects().length);
  document.body.style.overflow='hidden';
  (dialog.querySelector('input:not([disabled]),select:not([disabled]),textarea:not([disabled])')||items()[0])?.focus();
  const key=e=>{
   if(e.defaultPrevented||(e.key==='Escape'&&e.target.closest?.('.inline-select.is-open')))return;
   if(e.key==='Escape'){e.preventDefault();close.current?.();}
   if(e.key==='Tab'){
    const list=items(),first=list[0],last=list.at(-1);if(!first){e.preventDefault();return;}
    if(e.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow;previous?.focus?.();};
 },[]);
 return null;
}
