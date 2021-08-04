<template>
  <div>
    <el-button @click="register">register</el-button>
    <br/>
    <el-input v-model="callSipAdder" placeholder="sip地址"></el-input>
    <br/>
    <el-button @click="call">call</el-button>
    <br/>
    <el-input v-model="msg" placeholder="信息"></el-input>
    <br/>
    <el-button @click="sendMsg">sendMsg</el-button>
    <video ref="localVideoView" autoplay height="320px" width="420px"/>
    <audio ref="localAudioView"  />
    <video ref="remoteVideoStream" autoplay height="320px" width="420px"/>
    <audio ref="remoteAudioView" />
  </div>
</template>

<script>
import JsSIP from "jssip";

export default {
  name: "SipUA",
  data() {
    return {
      ua: Object,
      callSipAdder: "sip:1002@192.168.10.109",
      msg: "",
      incomingSession: Object,
      outgoingSession: Object,
      localStream: Object,
      constraints: {
        audio: true,
        video: true,
        mandatory: {
          maxWidth: 640,
          maxHeight: 360
        }
      }
    }
  },
  mounted() {
    this.register();
  },
  methods: {
    init() {
      //const socket = new JsSIP.WebSocketInterface('ws://192.168.10.109:5062');
      //const socket = new JsSIP.WebSocketInterface('wss://192.168.10.109:5063');
      const socket = new JsSIP.WebSocketInterface('wss://api.atomscat.com:5063');
      const configuration = {
        sockets: [socket],
        uri: 'sip:1005@192.168.10.109',
        authorization_user: '1005',
        password: '1234',
        display_name: '1005',
        // 计时器
        session_timers: false,
        // 注册会话超时时间
        register_expires: 3600 * 24
      };
      this.ua = new JsSIP.UA(configuration);
      this.ua.on("registered", function (data) {
        console.info("registered: ", data.response.status_code, ",", data.response.reason_phrase);
      })
    },
    getLocalMedia(stream) {
      console.info('Received local media stream', stream);
      this.localStream = stream;
      // this.$refs.videoView.src = URL.createObjectURL(stream);
      const video = this.$refs.localVideoView;
      const audio = this.$refs.localAudioView;
      audio.srcObject = stream;
      audio.onloadedmetadata = function (e) {
        audio.play();
        console.log(e)
      };
      video.srcObject = stream;
      video.onloadedmetadata = function (e) {
        video.play();
        console.log(e)
      };
    },
    initMedia() {
      navigator.mediaDevices.getUserMedia(this.constraints).then(this.getLocalMedia).catch(function (err) {
        console.error(err.name + ": " + err.message);
      });
    },
    // 接电话
    answer() {
      // this.initMedia();
      // todo
      this.incomingSession.answer({
        mediaConstraints: {
          audio: true,
          video: true
        },
        //rtcOfferConstraints: {'offerToReceiveAudio': true, 'offerToReceiveVideo': false},
        // sessionTimersExpires: 3600 * 24,
        mediaStream: this.localStream
      });
      //this.addRemoteStream();
    },
    //  add remote stream
    addRemoteStream() {
      console.log(this.incomingSession)
      this.incomingSession.connection.addEventListener('onaddstream', (event) => {
        console.log(event);
        const video = this.$refs.remoteVideoStream;
        video.srcObject = event.stream;
        video.onloadedmetadata = function (e) {
          video.play();
          console.log(e)
        };
      });
    },
    register() {
      this.init();
      this.initMedia();
      this.ua.registrator().setExtraHeaders([
        'X-Foo: bar'
      ]);
      const that = this;
      // 监听通话
      this.ua.on("newRTCSession", function (data) {
        console.log(data);
        if (data.originator === 'remote') { //incoming call
          console.info("incomingSession, answer the call");
          that.incomingSession = data.session;
          that.$confirm('是否接听?', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }).then(() => {
            // 接电话
            that.answer();
          }).catch(() => {
            //
            that.ua.terminateSessions();
          });
        } else {
          console.info("outgoingSession");
          that.outgoingSession = data.session;
          that.outgoingSession.on('connecting', function (data) {
            console.info(data);
          });
        }
      });

      // 监听短信
      this.ua.on("newMessage", function (data) {
        console.log(data);
        if (data.originator === 'local') {
          console.info('onNewMessage , OutgoingRequest - ', data.request);
        } else {
          console.info('onNewMessage , IncomingRequest - ', data.request);
        }
      });

      this.ua.on("sipEvent", function (data) {
        console.log(data);
      });

      this.ua.start();
    },
    // 拨打电话
    call() {
      const that = this;
      // Register callbacks to desired call events
      const eventHandlers = {
        'progress': function (e) {
          console.log('call is in progress: ' + e);
        },
        'failed': function (e) {
          console.log('call failed with cause: ' + e);
        },
        'ended': function (e) {
          console.log('call ended with cause: ' + e);
        },
        'confirmed': function (e) {
          console.log(e);
        },
        'peerconnection': function (event) {
          console.log(event);
          event.peerconnection.onaddstream = function(ev){
            console.info('onaddstream from remote - ', ev);
            const audio = that.$refs.remoteAudioView;
            audio.srcObject = ev.stream;
            audio.onloadedmetadata = function (e) {
              audio.play();
              console.log(e)
            };
            const video = that.$refs.remoteVideoStream;
            video.srcObject = ev.stream;
            video.onloadedmetadata = function (e) {
              video.play();
              console.log(e)
            };
          };
        }
      };

      const options = {
        'eventHandlers': eventHandlers,
        'mediaConstraints': {'audio': true, 'video': true},
         mediaStream: this.localStream
      };
      const session = this.ua.call(this.callSipAdder, options);
      console.log(session);
    },
    // 发信息
    sendMsg() {
      this.ua.sendMessage(this.callSipAdder, this.msg);
    }
  }
}
</script>

<style scoped>

</style>