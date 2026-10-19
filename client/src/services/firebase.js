import {initializeApp,getApps,getApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithPhoneNumber,RecaptchaVerifier} from 'firebase/auth';

const config={
 apiKey:import.meta.env.VITE_FIREBASE_API_KEY,
 authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
 projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,
 appId:import.meta.env.VITE_FIREBASE_APP_ID,
};
export const socialConfigured=Boolean(Object.values(config).every(Boolean));
let authInstance;
export function firebaseAuth(){
 if(!socialConfigured)throw new Error('Google and phone sign-in require Firebase setup. See README: Firebase Authentication.');
 if(!authInstance)authInstance=getAuth(getApps().length?getApp():initializeApp(config));
 return authInstance;
}
export async function loginWithGoogle(){
 const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 const result=await signInWithPopup(firebaseAuth(),provider);
 return result.user.getIdToken();
}
export function phoneVerifier(containerId){
 return new RecaptchaVerifier(firebaseAuth(),containerId,{size:'invisible'});
}
export async function requestPhoneCode(phone,verifier){return signInWithPhoneNumber(firebaseAuth(),phone,verifier)}
