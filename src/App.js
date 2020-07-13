import React, { useEffect, useRef } from 'react';
import { getManifest, getLicense } from './mslClient';
import { getManifestAndroid, getLicenseAndroid } from './mslClientAndroid';
import shaka from 'shaka-player';
// import logo from './logo.svg';
import './App.css';

const onErrorEvent = (event) => {
  // Extract the shaka.util.Error object from the event.
  onError(event.detail);
}

const onError = (error) => {
  // Log the error.
  console.error('Error code', error.code, 'object', error);
}

const App = () => {
  const video = useRef();
  // const player = useRef();
  const config = useRef();
  const keySession = useRef();
  const mediaKeys = useRef();
  // const sourceBuffer = useRef();

  const SERVER_CERT = 'Cr0CCAMSEOVEukALwQ8307Y2+LVP+0MYh/HPkwUijgIwggEKAoIBAQDm875btoWUbGqQD8eAGuBlGY+Pxo8YF1LQR+Ex0pDONMet8EHslcZRBKNQ/09RZFTP0vrYimyYiBmk9GG+S0wB3CRITgweNE15cD33MQYyS3zpBd4z+sCJam2+jj1ZA4uijE2dxGC+gRBRnw9WoPyw7D8RuhGSJ95OEtzg3Ho+mEsxuE5xg9LM4+Zuro/9msz2bFgJUjQUVHo5j+k4qLWu4ObugFmc9DLIAohL58UR5k0XnvizulOHbMMxdzna9lwTw/4SALadEV/CZXBmswUtBgATDKNqjXwokohncpdsWSauH6vfS6FXwizQoZJ9TdjSGC60rUB2t+aYDm74cIuxAgMBAAE6EHRlc3QubmV0ZmxpeC5jb20SgAOE0y8yWw2Win6M2/bw7+aqVuQPwzS/YG5ySYvwCGQd0Dltr3hpik98WijUODUr6PxMn1ZYXOLo3eED6xYGM7Riza8XskRdCfF8xjj7L7/THPbixyn4mULsttSmWFhexzXnSeKqQHuoKmerqu0nu39iW3pcxDV/K7E6aaSr5ID0SCi7KRcL9BCUCz1g9c43sNj46BhMCWJSm0mx1XFDcoKZWhpj5FAgU4Q4e6f+S8eX39nf6D6SJRb4ap7Znzn7preIvmS93xWjm75I6UBVQGo6pn4qWNCgLYlGGCQCUm5tg566j+/g5jvYZkTJvbiZFwtjMW5njbSRwB3W4CrKoyxw4qsJNSaZRTKAvSjTKdqVDXV/U5HK7SaBA6iJ981/aforXbd2vZlRXO/2S+Maa2mHULzsD+S5l4/YGpSt7PnkCe25F+nAovtl/ogZgjMeEdFyd/9YMYjOS4krYmwp3yJ7m9ZzYCQ6I8RQN4x/yLlHG5RH/+WNLNUs6JAZ0fFdCmw=';
  // const LICENSE_SERVER_URL = 'https://www.netflix.com/nq/msl_v1/cadmium/pbo_licenses/%5E1.0.0/router?reqAttempt=1&reqPriority=0&reqName=prefetch/license'

  useEffect(() => { video.current = document.querySelector('video'); }, []);
  // useEffect(() => {
  //   // Install built-in polyfills to patch browser incompatibilities.
  //   shaka.polyfill.installAll();

  //   // Check to see if the browser supports the basic APIs Shaka needs.
  //   if (shaka.Player.isBrowserSupported()) {
  //     // Everything looks good!
  //     video.current = document.querySelector('video');
  //     player.current = new shaka.Player(video.current);

  //     // Attach player to the window to make it easy to access in the JS console.
  //     window.player = player.current;

  //     // Listen for error events.
  //     player.addEventListener('error', onErrorEvent);
  //   } else {
  //     // This browser does not have the minimum set of APIs we need.
  //     console.error('Browser not supported!');
  //   }
  // }, []);


  // EME Check
  const keySystems = {
    widevine: ['com.widevine.alpha'],
    playready: ['com.microsoft.playready', 'com.youtube.playready'],
    clearkey: ['webkit-org.w3.clearkey', 'org.w3.clearkey'],
    primetime: ['com.adobe.primetime', 'com.adobe.access'],
    fairplay: ['com.apple.fairplay']
  };

  const supportsEncryptedMediaExtension = function (config) {
    const supportedSystems = [];
    const unsupportedSystems = [];
    const isKeySystemSupported = function (keySystem) {
      // var config = getKeySystemConfig(); // [{initDataTypes: ['cenc']}];
      // const config = {
      //   initDataTypes: ["cenc"],
      //   audioCapabilities: [{
      //      contentType: 'audio/mp4;codecs="mp4a.40.2"'
      //   }],
      //   videoCapabilities: [{
      //      contentType: 'video/mp4;codecs="avc1.42E01E"'
      //   }]
      // };
      if (window.navigator.requestMediaKeySystemAccess) {
        window.navigator.requestMediaKeySystemAccess(keySystem, config).then(function (keySystemAccess) {
          supportedSystems.push(keySystem);
        }).catch(function () {
          unsupportedSystems.push(keySystem);
        });
      }
    };
    let keysys, dummy, i;
    for (keysys in keySystems) {
      if (keySystems.hasOwnProperty(keysys)) {
        for (dummy in keySystems[keysys]) {
          isKeySystemSupported(keySystems[keysys][dummy]);
        }
      }
    }
    console.log(config);
    console.log('supportedSystems', supportedSystems);
    console.log('unsupportedSystems', unsupportedSystems);
  };

  function supportsVideoType(type) {
    // Allow user to create shortcuts, i.e. just "webm"
    let formats = {
      ogg: 'video/ogg; codecs="theora"',
      h264: 'video/mp4; codecs="avc1.42E01E"',
      webm: 'video/webm; codecs="vp8, vorbis"',
      vp9: 'video/webm; codecs="vp9"',
      hls: 'application/x-mpegURL; codecs="avc1.42E01E"',
      mp4: 'video/mp4;codecs="avc1.42E01E, mp4a.40.2"'
    };
    const supportedCodecs = [];
    for (let format in formats) {
      console.log(formats[format]);
      supportedCodecs.push({ codec: format, support: video.current.canPlayType(formats[format]) });
      supportsEncryptedMediaExtension([{
        initDataTypes: ["cenc"],
        videoCapabilities: [{ contentType: formats[format] }]
      }]);
    }
    console.log(supportedCodecs);
  }


  const obtainSessionMediaKeys = async () => {
    config.current = getKeySystemConfig();
    mediaKeys.current = await initMediaKeySystem();
    await createMediaKeySession();
  };
  
  // Netflix only
  const getKeySystemConfig = () => {
    if (window.Android) {
      return [{
        // distinctiveIdentifier: 'not-allowed',
        // initDataTypes: ["cenc"],
        sessionTypes: ["temporary"],
        videoCapabilities: [
          {
            contentType: 'video/mp4; codecs="avc1.42E01E"',
            // robustness: 'SW_SECURE_CRYPTO'
          },
          // {
          //   contentType: 'video/mp4; codecs="avc1.42E01E"',
          //   robustness: 'SW_SECURE_DECODE'
          // }
        ],
        audioCapabilities: [{
          contentType: 'audio/mp4; codecs="mp4a.40.2"',
          robustness: 'SW_SECURE_CRYPTO'
        }]
      }];
    } else {
      return [{
        distinctiveIdentifier: 'not-allowed',
        videoCapabilities: [
          {
            contentType: 'video/webm; codecs="vp9"',
            robustness: 'HW_SECURE_DECODE'
          },
          {
            contentType: 'video/webm; codecs="vp9"',
            robustness: 'SW_SECURE_DECODE'
          }
        ],
        audioCapabilities: [{
          contentType: 'audio/mp4; codecs="mp4a.40.5"',
          robustness: 'SW_SECURE_CRYPTO'
        }]
      }];
    }
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
      video.current.setMediaKeys(mediaKeys);
       // Netflix only
      mediaKeys.setServerCertificate(Uint8Array.from(atob(SERVER_CERT), c => c.charCodeAt(0))).then(ok => console.log('valid server certificate', ok));
      return mediaKeys;
    } catch (error) {
      console.log(error.message);
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
    const challengeBase64 = btoa(String.fromCharCode(...new Uint8Array(event.message)));
    let license;
    if (window.Android) {
      license = await getLicenseAndroid(challengeBase64, event.target.sessionId);
    } else {
      license = await getLicense(challengeBase64, event.target.sessionId);
    }
    // const response = await fetch(LICENSE_SERVER_URL, { method: 'POST', body: event.message });
    // const license = await response.arrayBuffer();
    console.log('The returned license is:', license);
    const keySession = event.target;
    const licenseAB = Uint8Array.from(atob(license), c => c.charCodeAt(0));
    // const licenseAB = new Uint8Array(atob(license));
    // console.log('The license for keysession', atob(license), licenseAB);
    await keySession.update(licenseAB).catch(
      console.error.bind(console, 'update() failed')
    );
    // await video.current.setMediaKeys(mediaKeys.current);
    // console.log(keySession);
    console.log('video.current.mediaKeys', video.current.mediaKeys)

    // video.current.play();
  }

  // const fetchAB = (url, cb) => {
  //   console.log(url);
  //   var xhr = new XMLHttpRequest();
  //   xhr.open('get', url);
  //   xhr.responseType = 'arraybuffer';
  //   xhr.onload = function () {
  //     cb(xhr.response);
  //   };
  //   xhr.send();
  // }

  const playSomethingFromNetflix = async () => {
    const showUrl = document.getElementById('netflixShowUrl').value;
    // console.log('showUrl', showUrl, window.Android ? 'NFCDCH-01-GGQ0FUED5N7HC239K6L2HXN4W81XL0' : 'NFCDCH-02-GGQ0FUED5N7HC239K6L2HXN4W81XL0');
    let manifest;
    if (!window.Android) {
      manifest = await getManifest(
        showUrl || 'https://www.netflix.com/watch/80178790',
        'NFCDCH-02-GGQ0FUED5N7HC239K6L2HXN4W81XL0');
    } else {
      manifest = await getManifestAndroid(
        showUrl || 'https://www.netflix.com/watch/80178790',
        'NFCDCH-01-GGGGJDEGRGXKTTAKCDTJ4TC9MEJHX2');
    }

    // Try to load a manifest.
    // This is an asynchronous process.
    // player.load(manifestUri).then(function() {
    //   // This runs if the asynchronous load is successful.
    //   console.log('The video has now been loaded!');
    // }).catch(onError);  // onError is executed if the asynchronous load fails.


    const mediaSource = new MediaSource();
    video.current.src = window.URL.createObjectURL(mediaSource);

    let vidSourceBuffer;
    let audSourceBuffer;
    mediaSource.addEventListener('sourceopen', () => {
      console.log('readyState', mediaSource.readyState);
      // console.log('readyState', this.readyState);
      // vidSourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.640028"');
      // audSourceBuffer = mediaSource.addSourceBuffer('audio/mp4; codecs="mp4a.40.5"');
      vidSourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E"');
      audSourceBuffer = mediaSource.addSourceBuffer('audio/mp4; codecs="mp4a.40.2"');
      vidSourceBuffer.addEventListener('error', (err) => console.log('vidSourceBuffer err', err)); 
      vidSourceBuffer.addEventListener('update', (res) => console.log('vidSourceBuffer update', res)); 
      vidSourceBuffer.addEventListener('abort', (res) => console.log('vidSourceBuffer abort', res)); 
      vidSourceBuffer.addEventListener('updatestart', (res) => console.log('vidSourceBuffer updatestart', res));
      console.log('Video Source buffer created', vidSourceBuffer);


      // const url = 'https://ipv4-c001-den001-t-mobile-isp.1.oca.nflxvideo.net/range/0-46787?o=AQMZ_Puu5NyQPrlZpdsQTg8swrRef0kunb8Q4aBPHrvSrYyr84SzpeLIItm3Zu9GHrCaZJD0Larux50vTzYtD_n_1srxof3ziPQgCdo-v5I2OYUbHgoP2a7FTxUB05WFYoOS5ZOcFVKAWMQimv4L5ejAIgeRgB8S6J9tHTxVw_e_uTT9YKP_itbjh7UMJQm5LAH2JMue9tevujEhb1XAFWPuckT4FmJ0zlEjsokHAmh3VoDs&v=5&e=1593559874&t=03OddDPJOFByxk72BMaX7I5aIjY';
      const vidBaseUrl = manifest.video_tracks[0].streams[0].urls[0].url;
      console.log('vid selected url', vidBaseUrl);
      const audBaseUrl = manifest.audio_tracks[0].streams[0].urls[0].url;
      console.log('aud selected url', audBaseUrl);

      const loadChunk = async (range) => {
        const url = vidBaseUrl.split('?')[0] + 'range/' + range + '?' + vidBaseUrl.split('?')[1];
        const vidResponse = await fetch(vidBaseUrl);
        // const vidResponse = await fetch('https://4319062544fa.ngrok.io/download-vid.ntflx');
        const vidRawChunk = await vidResponse.arrayBuffer();
        // const chunk = new Uint8Array(rawChunk);
        // console.log(chunk);
        // console.log(vidRawChunk);
        vidSourceBuffer.appendBuffer(vidRawChunk);

        const audResponse = await fetch(audBaseUrl);
        // const audResponse = await fetch('https://4319062544fa.ngrok.io/download-aud.ntflx');
        const audRawChunk = await audResponse.arrayBuffer();
        audSourceBuffer.appendBuffer(audRawChunk);

      };

      ['0-50738'].map(loadChunk);
    }, false);
  }

  // const onDecryptMslClick = async () => {
  //   const encrypted = document.getElementById('mslResponse').nodeValue;
  //   console.log(encrypted);
  //   const decrypted = await decryptMslResponse(encrypted);
  //   console.log(decrypted);
  //   document.getElementById('mslDecrypted').value = decrypted;
  // }

  return (
    <div className="App">
      <header className="App-header">
        {/* <img src={logo} className="App-logo" alt="logo" /> */}
        <video id="my-vid" width="320" height="240" autoPlay controls playsInline />
        <p>
          Watch Netflix in a video tag!
        </p>
        <button onClick={obtainSessionMediaKeys}>Initialize Media Key System</button>
        <button onClick={playSomethingFromNetflix}>Request Manifest for Show</button>
        <input id="netflixShowUrl" style={{ width: '50vw' }} type="text"></input>
        {/* <button onClick={() => window.Android.sendMSLRequest("Hey there")}>Send Android Message</button> */}
        <button onClick={supportsEncryptedMediaExtension}>Check Key Systems</button>
        <button onClick={supportsVideoType}>Check Codecs</button>
      </header>
    </div>
  );
}

export default App;
