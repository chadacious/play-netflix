import React, { useRef } from 'react';
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
    mediaKeys.current = await initMediaKeySystem(config.current, video.current);
    await createMediaKeySession(mediaKeys.current);
  };

  // Netflix only
  const getKeySystemConfig = () => {
      return [{
        distinctiveIdentifier: 'not-allowed',
        videoCapabilities: [{
          contentType: 'video/mp4;codecs=avc1.42E01E',
          robustness: 'HW_SECURE_DECODE'
        }, {
          contentType: 'video/mp4;codecs=avc1.42E01E',
          robustness: 'SW_SECURE_DECODE'
        }],
        audioCapabilities: [{
          contentType: 'audio/mp4;codecs=mp4a.40.2',
          robustness: 'SW_SECURE_CRYPTO'
        }]
      }];
  }

  const initMediaKeySystem = async (config, video) => {
    try {
      const keySystem = await navigator.requestMediaKeySystemAccess('com.widevine.alpha', config);
      const mediaKeys = await keySystem.createMediaKeys();
       // Netflix only
      mediaKeys.setServerCertificate(Uint8Array.from(atob(SERVER_CERT), c => c.charCodeAt(0))).then(ok => console.log('valid server certificate', ok));
      video.setMediaKeys(mediaKeys);
      return mediaKeys;
    } catch (error) {
      console.log(error);
      throw error;
    }
      
  }
  
  // Netflix only version
  const createMediaKeySession = async (mediaKeys) => {
    keySession.current = mediaKeys.createSession(
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
    const response = await fetch(LICENSE_SERVER_URL, { method: 'POST', body: event.message });
    const license = await response.arrayBuffer();
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

  const playSomethingFromNetflix = () => {
    const mediaSource = new MediaSource();
    mediaSource.addEventListener('sourceopen', async () => {
      console.log('readyState', mediaSource.readyState);
      // console.log('readyState', this.readyState);
      sourceBuffer.current = mediaSource.addSourceBuffer('video/mp4;codecs=avc1.42E01E')
      console.log('Source buffer created', sourceBuffer.current);
      const url = 'https://ipv4-c368-sjc002-dev-ix.1.oca.nflxvideo.net/range/4207714-4469400?o=AQNwDtVmbrwBmALNRGIVD9NUsZnlpkUCzZxzoVumToxBIkB4ctMbafl5qsVx98zGRwpJeiGIeRwao8wAJZeFWIVNy5U31ifbUAcnAb_SWbWkPTC477ybqEtfVyWz3gXQnjLQW-l8CNe_549_H_kdQ6hEsi544irLU5Jed5v8ASCBjgzjmuG5xjmgnvVcE-r3NPw2iF2Xsf6ApTxDWbY8CMKFElQUr8q40PBPNReWQYZ7Ek9dqXVlpBLF2A&v=5&e=1593517142&t=SLpKcFDiZp2TAXeSfvaWk9zCLl4&sc=Eq%02%06%20IpG%04x%02%5Ef%06ztlY%00Lp%04o%08f%06r%5D%24IFW49%0FFb%2B%0A%10o%5EH%7D~%03%1DHVvQgG';
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
        {/* <button onClick={playIt}>Play</button> */}
      </header>
    </div>
  );
}

export default App;
