import {initializeApp,cert,getApps} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
export function firebaseConfigured(){return Boolean(process.env.FIREBASE_PROJECT_ID&&process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY)}
export async function verifyFirebaseToken(idToken){
 if(!firebaseConfigured()){const err=new Error('Social sign-in is not configured on this server.');err.status=503;throw err}
 if(!getApps().length){initializeApp({credential:cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n')})})}
 return getAuth().verifyIdToken(idToken,true);
}
