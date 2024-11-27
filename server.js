const { SerialPort, ReadlineParser } = require('serialport');
const WebSocket = require('ws');

// 配置串口连接
const port = new SerialPort({
  path: 'COM4', // 根据实际情况修改串口号
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

// 添加 WebSocket 服务启动日志
console.log('WebSocket server running on port 8080.');

// WebSocket 客户端连接
wss.on('connection', (ws) => {
  console.log('WebSocket client connected.');

  // 监听 Arduino 数据
  parser.on('data', (data) => {
    const command = data.trim();
    console.log(`Received from Arduino: ${command}`);
    if (command === 'jump') {
      ws.send('jump'); // 将跳跃指令发送给 WebSocket 客户端
      console.log('Jump command sent to client.');
    }
  });

  // 监听来自客户端的消息（用于调试）
  ws.on('message', (message) => {
    console.log(`Received from client: ${message}`);
  });

  // 处理 WebSocket 客户端关闭
  ws.on('close', () => {
    console.log('WebSocket client disconnected.');
  });
});

parser.on('data', (data) => {
    console.log(`Received raw data from Arduino: ${data.trim()}`); // 打印原始数据
    const command = data.trim();
    if (command === 'jump') {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send('jump');
                console.log('Jump command sent to client.');
            }
        });
    }
});

// 错误处理
port.on('error', (err) => {
  console.error(`Serial port error: ${err.message}`);
});

wss.on('error', (err) => {
  console.error(`WebSocket server error: ${err.message}`);
});
