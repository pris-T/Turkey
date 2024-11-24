const { SerialPort, ReadlineParser } = require('serialport');
const WebSocket = require('ws');

// 配置串口连接
const port = new SerialPort({
  path: 'COM4',  // 根据实际情况修改串口号
  baudRate: 9600,
});

// 设置解析器
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ port: 8080 });

// 打开串口
port.on('open', () => {
  console.log('Serial port opened.');
});

// WebSocket 客户端连接
wss.on('connection', (ws) => {
  console.log('WebSocket client connected.');

  // 监听 Arduino 数据
  parser.on('data', (data) => {
    const command = data.trim();
    console.log(`Received: ${command}`);
    if (command === 'jump') {
      ws.send('jump'); // 将跳跃指令发送给 WebSocket 客户端
      console.log('Jump command sent to client.');
    }
  });

  // 监听客户端消息（可选，用于调试）
  ws.on('message', (message) => {
    console.log(`Received from client: ${message}`);
  });
});
