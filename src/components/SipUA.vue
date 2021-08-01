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
    <video ref="videoView" autoplay height="320px" width="420px"></video>
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
  methods: {
    init() {
      const socket = new JsSIP.WebSocketInterface('ws://192.168.10.109:5062');
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
    },
    getLocalMedia(stream) {
      console.info('Received local media stream');
      this.localStream = stream;
      this.$refs.videoView.src = URL.createObjectURL(stream);
    },
    initMedia() {
      navigator.mediaDevices.getUserMedia(this.constraints).then(this.getLocalMedia).catch(function(err) {
        console.error(err.name + ": " + err.message);
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
          that.initMedia();
          that.incomingSession = data.session;
          data.session.answer({
            'mediaConstraints': {
              'audio': true,
              'video': true,
              mandatory: {maxWidth: 640, maxHeight: 360}
            }, 'mediaStream': that.localStream
          });
        } else {
          console.info("outgoingSession");
          that.outgoingSession = data.session;
          that.outgoingSession.on('connecting', function (data) {
            console.info('onConnecting - ', data.request);
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
      // Register callbacks to desired call events
      const eventHandlers = {
        'progress': function (e) {
          console.log('call is in progress: ' + e.data);
        },
        'failed': function (e) {
          console.log('call failed with cause: ' + e.data.cause);
        },
        'ended': function (e) {
          console.log('call ended with cause: ' + e.data.cause);
        },
        'confirmed': function (e) {
          console.log('call confirmed: ' + e.data);
        }
      };

      const options = {
        'eventHandlers': eventHandlers,
        'mediaConstraints': {'audio': true, 'video': true}
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