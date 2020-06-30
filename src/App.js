import React, { useRef } from 'react';
import { getManifest, getLicense, decryptMslResponse } from './mslClient';
// import logo from './logo.svg';
import './App.css';

const App = () => {
  const video = useRef();
  const config = useRef();
  const keySession = useRef();
  const mediaKeys = useRef();
  const sourceBuffer = useRef();

  const SERVER_CERT = 'Cr0CCAMSEOVEukALwQ8307Y2+LVP+0MYh/HPkwUijgIwggEKAoIBAQDm875btoWUbGqQD8eAGuBlGY+Pxo8YF1LQR+Ex0pDONMet8EHslcZRBKNQ/09RZFTP0vrYimyYiBmk9GG+S0wB3CRITgweNE15cD33MQYyS3zpBd4z+sCJam2+jj1ZA4uijE2dxGC+gRBRnw9WoPyw7D8RuhGSJ95OEtzg3Ho+mEsxuE5xg9LM4+Zuro/9msz2bFgJUjQUVHo5j+k4qLWu4ObugFmc9DLIAohL58UR5k0XnvizulOHbMMxdzna9lwTw/4SALadEV/CZXBmswUtBgATDKNqjXwokohncpdsWSauH6vfS6FXwizQoZJ9TdjSGC60rUB2t+aYDm74cIuxAgMBAAE6EHRlc3QubmV0ZmxpeC5jb20SgAOE0y8yWw2Win6M2/bw7+aqVuQPwzS/YG5ySYvwCGQd0Dltr3hpik98WijUODUr6PxMn1ZYXOLo3eED6xYGM7Riza8XskRdCfF8xjj7L7/THPbixyn4mULsttSmWFhexzXnSeKqQHuoKmerqu0nu39iW3pcxDV/K7E6aaSr5ID0SCi7KRcL9BCUCz1g9c43sNj46BhMCWJSm0mx1XFDcoKZWhpj5FAgU4Q4e6f+S8eX39nf6D6SJRb4ap7Znzn7preIvmS93xWjm75I6UBVQGo6pn4qWNCgLYlGGCQCUm5tg566j+/g5jvYZkTJvbiZFwtjMW5njbSRwB3W4CrKoyxw4qsJNSaZRTKAvSjTKdqVDXV/U5HK7SaBA6iJ981/aforXbd2vZlRXO/2S+Maa2mHULzsD+S5l4/YGpSt7PnkCe25F+nAovtl/ogZgjMeEdFyd/9YMYjOS4krYmwp3yJ7m9ZzYCQ6I8RQN4x/yLlHG5RH/+WNLNUs6JAZ0fFdCmw=';
  const LICENSE_SERVER_URL = 'https://www.netflix.com/nq/msl_v1/cadmium/pbo_licenses/%5E1.0.0/router?reqAttempt=1&reqPriority=0&reqName=prefetch/license'

  const obtainSessionMediaKeys = async () => {
    video.current = document.querySelector('video');
    config.current = getKeySystemConfig();
    mediaKeys.current = await initMediaKeySystem();
    await createMediaKeySession();
  };
  
  // Netflix only
  const getKeySystemConfig = () => {
      return [{
        distinctiveIdentifier: 'not-allowed',
        videoCapabilities: [{
          contentType: 'video/mp4;codecs=vp09.00.11.08.02',
          robustness: 'HW_SECURE_DECODE'
        }, {
          contentType: 'video/mp4;codecs=vp09.00.11.08.02',
          robustness: 'SW_SECURE_DECODE'
        }],
        audioCapabilities: [{
          contentType: 'audio/mp4; codecs="mp4a.40.5"',
          robustness: 'SW_SECURE_CRYPTO'
        }]
      }];

      // return [{
      //   distinctiveIdentifier: 'not-allowed',
      //   initDataTypes: ['cenc'],
      //   label: '',
      //   persistentState: 'required',
      //   sessionTypes: ['temporary'],
      //   videoCapabilities: [{
      //     contentType: 'video/mp4; codecs="avc1.640028"',
      //     robustness: 'SW_SECURE_DECODE',
      //     encryptionScheme: null
      //   }, {
      //     contentType: 'video/mp4; codecs="avc1.640028"',
      //     robustness: 'SW_SECURE_CRYPTO',
      //     encryptionScheme: null
      //   }],
      //   audioCapabilities: [{
      //     contentType: 'audio/mp4; codecs="mp4a.40.5"',
      //     robustness: "SW_SECURE_CRYPTO",
      //     encryptionScheme: null
      //   }]
      // }];

  }

  
  const initMediaKeySystem = async () => {
    try {
      const keySystem = await navigator.requestMediaKeySystemAccess('com.widevine.alpha', config.current);
      const mediaKeys = await keySystem.createMediaKeys();
       // Netflix only
      mediaKeys.setServerCertificate(Uint8Array.from(atob(SERVER_CERT), c => c.charCodeAt(0))).then(ok => console.log('valid server certificate', ok));
      video.current.setMediaKeys(mediaKeys);
      return mediaKeys;
    } catch (error) {
      console.log(error);
      throw error;
    }
      
  }
  
  // Netflix only version
  const createMediaKeySession = async () => {
    keySession.current = mediaKeys.current.createSession(
      'temporary',
      new Uint8Array(0),
      new Uint8Array(`<ServerCert>${SERVER_CERT}</ServerCert>`));

      keySession.current.addEventListener('message', handleMessage, false);

    video.current.addEventListener('encrypted', (event) => {
      console.log('here in video encrypted', event);
      keySession.current.generateRequest('cenc', event.initData);
    })
  }
  
  const handleMessage = async (event) => {
    console.log('here in handleMessage', event);
    const license = await getLicense(event.message, event.target.sessionId);
    // const response = await fetch(LICENSE_SERVER_URL, { method: 'POST', body: event.message });
    // const license = await response.arrayBuffer();
    const keySession = event.target;
    keySession.update(license);
  }

  const fetchAB = (url, cb) => {
    console.log(url);
    var xhr = new XMLHttpRequest();
    xhr.open('get', url);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function () {
      cb(xhr.response);
    };
    xhr.send();
  }

  const playSomethingFromNetflix = async () => {
    const manifest = await getManifest('https://www.netflix.com/watch/80244088');
    const mediaSource = new MediaSource();
    mediaSource.addEventListener('sourceopen', async () => {
      console.log('readyState', mediaSource.readyState);
      // console.log('readyState', this.readyState);
      sourceBuffer.current = mediaSource.addSourceBuffer('video/mp4;codecs=vp09.00.11.08.02')
      console.log('Source buffer created', sourceBuffer.current);
      const url = 'https://ipv4-c001-den001-t-mobile-isp.1.oca.nflxvideo.net/range/0-46787?o=AQMZ_Puu5NyQPrlZpdsQTg8swrRef0kunb8Q4aBPHrvSrYyr84SzpeLIItm3Zu9GHrCaZJD0Larux50vTzYtD_n_1srxof3ziPQgCdo-v5I2OYUbHgoP2a7FTxUB05WFYoOS5ZOcFVKAWMQimv4L5ejAIgeRgB8S6J9tHTxVw_e_uTT9YKP_itbjh7UMJQm5LAH2JMue9tevujEhb1XAFWPuckT4FmJ0zlEjsokHAmh3VoDs&v=5&e=1593559874&t=03OddDPJOFByxk72BMaX7I5aIjY';
      fetchAB(url, (buf) => {
        // const rawChunk = await response.arrayBuffer();
        // const chunk = new Uint8Array(rawChunk);
        sourceBuffer.current.addEventListener('updateend', () => {
          console.log('readyState', mediaSource.readyState);
          // mediaSource.endOfStream();
          video.current.play();
          //console.log(mediaSource.readyState); // ended
        });
        sourceBuffer.current.appendBuffer(buf);
        console.log('appended to source buffer', sourceBuffer.current.buffered);
      });
    }, false);

    video.current.src = window.URL.createObjectURL(mediaSource);
  }


  // const getShowManifest = () => {
  //   const localeId = "en-US";

  //   const manifestRequestData = {
  //     "version": 2,
  //     "url": "/manifest",
  //     "id": Date.now(),
  //     "esn": defaultEsn,
  //     "languages": [localeId],
  //     "uiVersion": "shakti-v4bf615c3",
  //     "clientVersion": "6.0015.328.011",
  //     "params": {
  //       "type": "standard",
  //       "viewableId": viewableId,
  //       "profiles": profiles,
  //       "flavor": "STANDARD",
  //       "drmType": "widevine",
  //       "drmVersion": 25,
  //       "usePsshBox": true,
  //       "isBranching": false,
  //       "useHttpsStreams": true,
  //       "imageSubtitleHeight": 720,
  //       "uiVersion": "shakti-v4bf615c3",
  //       "clientVersion": "6.0015.328.011",
  //       "supportsPreReleasePin": true,
  //       "supportsWatermark": true,
  //       "showAllSubDubTracks": false,
  //       "videoOutputInfo": [
  //         {
  //           "type": "DigitalVideoOutputDescriptor",
  //           "outputType": "unknown",
  //           "supportedHdcpVersions": ['1.4'],
  //           "isHdcpEngaged": true
  //         }
  //       ],
  //       "preferAssistiveAudio": false,
  //       "isNonMember": false
  //     }
  //   };
    
  //   header.userauthdata = {
  //     "scheme": "NETFLIXID",
  //     "authdata": {}
  //   };

  // };

  const onDecryptMslClick = async () => {
    const encrypted = document.getElementById('mslResponse').nodeValue;
    console.log(encrypted);
    const decrypted = await decryptMslResponse(encrypted);
    console.log(decrypted);
    document.getElementById('mslDecrypted').value = decrypted;
  }

  return (
    <div className="App">
      <header className="App-header">
        {/* <img src={logo} className="App-logo" alt="logo" /> */}
        <video id="my-vid" width="320" height="240" controls />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <button onClick={obtainSessionMediaKeys}>Initialize Media Key System</button>
        <button onClick={playSomethingFromNetflix}>Request Manifest for Show</button>
        <input id="mslResponse" type="text"></input>
        <button onClick={onDecryptMslClick}>Decrypt Msl Response</button>
        <textarea id="mslDecrypted"></textarea>
        {/* <button onClick={playIt}>Play</button> */}
      </header>
    </div>
  );
}

export default App;
