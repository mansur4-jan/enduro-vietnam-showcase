'use client';
import {useEffect} from 'react';
export function RuHomepageRuntime({version}:{version:string}){useEffect(()=>{const script=document.createElement('script');script.src='/assets/homepage-ru/runtime.js?v='+version;document.body.append(script);return ()=>{document.dispatchEvent(new Event('ru-home-destroy'));script.remove();};},[version]);return null;}
