import {mkdtemp,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const exec=promisify(execFile);
export async function normalizeForTranscription(buffer){
 const dir=await mkdtemp(path.join(tmpdir(),'whale-audio-'));const input=path.join(dir,'input'),output=path.join(dir,'speech.mp3');
 try{await writeFile(input,buffer,{mode:0o600});await exec('/usr/bin/ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-y','-i',input,'-vn','-t','1801','-ac','1','-ar','16000','-c:a','libmp3lame','-b:a','64k',output],{timeout:60000,maxBuffer:256*1024});const info=await exec('/usr/bin/ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',output],{timeout:10000,maxBuffer:8192});const seconds=Number(info.stdout.trim());if(!Number.isFinite(seconds)||seconds<=0)throw Error('invalid');if(seconds>1800)throw Object.assign(Error('录音超过30分钟，请分段上传后转写'),{status:400});if((await stat(output)).size>20*1024*1024)throw Error('large');return await readFile(output);
 }catch(e){if(e.status)throw e;throw Object.assign(Error(e.code==='ENOENT'?'录音处理服务未配置，请联系管理员':'录音无法解码或处理超时，请检查文件后重试'),{status:502});}finally{await rm(dir,{recursive:true,force:true})}
}
