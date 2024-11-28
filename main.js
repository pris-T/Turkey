// main.js

const playerSpeed = 100; // 全局常量，玩家移动速度

const config = {
    type: Phaser.AUTO,
    width: 800,     // 游戏画布宽度
    height: 500,    // 修改为600
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 400 }, // 从1000降低到800
            debug: false          // 改为 true
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// 所有全局变量声明
let gameSocket;
let player;
let cursors;
let grounds;
let obstacles;
let background;
let jumpCount = 0; // 跳跃次数计数器
const maxJumpHeight = 300;  // 最大离地高度 
const groundLevel = 560;   // 地面的Y坐标，修改为560
let bonuses;  // 奖励物组
let scoreText;
let floatingText;
let score = 0;
let hearts;
let heart1;
let heart2;
let heart3;  // 添加第三颗心的变量
let gameOver = false;
let currentScene; // 添加这个变量来存储场景引用

// 创建奖励物分数配置
const BONUS_SCORES = {
    'prop1': 2000,  // 蛋糕 2000分
    'prop2': 1000,  // 甜甜圈 1000分
    'prop3': 1500   // 纸杯蛋糕 1500分
};

// 声明全局变量来存储串口连接
let serialPort = null;
let serialReader = null;

// 在 WebSocket 相关代码之前添加这个全局函数
window.triggerJump = function (player) {
    if (!player) {
        console.warn('Player not initialized');
        return;
    }

    console.log('Triggering jump for player:', player);

    // 如果玩家正在跳跃冷却中，直接返回
    if (player.jumpCooldown) {
        return;
    }

    // 在地面上 - 第一跳
    if (player.body.blocked.down) {
        player.isJumping = true;
        player.jumpStage = 1;
        player.body.setVelocityY(-500);  // 第一跳
        player.setVisible(false);
        player.jumpVideo.setVisible(true);
        
        // 第一跳后的冷却
        player.jumpCooldown = true;
        currentScene.time.delayedCall(150, () => {  // 150ms 的冷却时间
            player.jumpCooldown = false;
        });
        console.log('First jump');
    } 
    // 第二跳
    else if (player.jumpStage === 1) {
        player.body.setVelocityY(-800);
        player.jumpStage = 2;
        console.log('Second jump');
    }
};

// 修改 WebSocket 消息处理函数
function handleWebSocketMessage(event) {
    console.log('receive WebSocket message:', event.data);
    if (event.data === 'jump' && player) {
        console.log('jump,player status:', {
            isJumping: player.isJumping,
            jumpStage: player.jumpStage
        });
        window.triggerJump(player);  // 使用 window.triggerJump
    }
}

// 初始化 WebSocket 连接
function initWebSocket() {
    gameSocket = new WebSocket('ws://localhost:8080');

    gameSocket.onopen = () => {
        console.log('WebSocket 连接成功');
    };

    gameSocket.onmessage = handleWebSocketMessage;

    gameSocket.onerror = (error) => {
        console.error('WebSocket 错误:', error);
    };

    gameSocket.onclose = () => {
        console.log('WebSocket 连接关闭');
    };
}

function preload() {
    // 加载视频
    this.load.video('playerVideo', 'assets/Run.webm', 'loadeddata', false, true);
    this.load.video('jumpVideo', 'assets/Jump.webm', 'loadeddata', false, true);
    this.load.video('gameOverVideo', 'assets/final.webm', 'loadeddata', false, true);
    // 加载背景图片
    this.load.image('background', 'assets/background.png');

    // 加载障碍物图片
    this.load.image('obs1', 'assets/obs1.png');  // 黄色锅
    this.load.image('obs2', 'assets/obs2.png');  // 蓝色锅
    this.load.image('obs3', 'assets/obs3.png');  // 平底锅
    this.load.image('knife', 'assets/knife.png'); // 添加刀的图片

    // 加载道具图片
    this.load.image('prop1', 'assets/prop1.png');  // 蛋糕
    this.load.image('prop2', 'assets/prop2.png');  // 甜甜圈
    this.load.image('prop3', 'assets/prop3.png');  // 纸杯蛋糕

    // 加载冰箱图片
    this.load.image('refrig', 'assets/refrig.png');  // 冰箱

    // 加载地面图片
    this.load.image('floor', 'assets/floor.png');
    // 加载重启按钮图片
    this.load.image('restart', 'assets/restart.png');
    this.load.image('gameover', 'assets/defeat.png');
}

function create() {
    // Reset game state
    gameOver = false;
    score = 0;
    jumpCount = 0;
    
    // Reset player-specific variables
    player = null;
    
    // 在create开始时保存场景引用
    currentScene = this;

    // 初始化 WebSocket 连接
    initWebSocket();

    // 设置更大的世界边界
    this.physics.world.setBounds(0, 0, 16000, 600);



    // 创建左侧墙壁
    const wallWidth = 40;  // 墙壁宽度
    const wallHeight = 600;  // 墙壁高度
    const leftWall = this.add.rectangle(0, 0, wallWidth, wallHeight, 0x228B22)
        .setOrigin(0, 0);

    // 添加物理属性
    this.physics.add.existing(leftWall, true); // true表示静态物体

    // 添加背景图片 - 使用 TileSprite 替代普通 Image
    const bg = this.add.tileSprite(0, -50, 16000, 700, 'background')
        .setOrigin(0, 0)
        .setScrollFactor(0.3); // 设置视差效果

    // 调整背景图片大小以适应屏幕
    bg.setDisplaySize(16000, 600);

    // 创建更多地面片段
    grounds = this.physics.add.staticGroup();
    for (let i = 0; i < 40; i++) {
        const ground = this.add.sprite(i * 400, groundLevel, 'floor')
            .setOrigin(0, 0);

        // 调整地面图片大小
        ground.setDisplaySize(400, 40);

        this.physics.add.existing(ground, true);
        grounds.add(ground);
    }

    // 创建障碍物组
    obstacles = this.physics.add.group({
        allowGravity: false,
        immovable: true
    });

    // 创建视频精灵
    const video = this.add.video(100, groundLevel - 25, 'playerVideo');
    const jumpVideo = this.add.video(100, groundLevel - 25, 'jumpVideo');

    // 设置视频属性 - 保持原有数值
    video.setScale(40 / video.width, 50 / video.height);
    jumpVideo.setScale(40 / jumpVideo.width, 50 / jumpVideo.height);

    video.play(true);
    jumpVideo.play(true);
    jumpVideo.setVisible(false);

    // 设置物理属性
    this.physics.add.existing(video);
    video.body.setCollideWorldBounds(true);

    // 调整碰撞箱大小和偏移 - 保持原有数值
    video.body.setSize(500, 500);
    video.body.setOffset(150, 230);

    // 调整物理属性 
    video.body.setBounce(0);
    video.body.setDragX(0);
    video.body.setMass(1);

    // 初始化玩家对象
    player = video;
    player.jumpVideo = jumpVideo;
    player.direction = 'right';
    player.isJumping = false;
    player.jumpStage = 0;

    console.log('Player initialized:', player);

    // 添加调试代码
    console.log('Video loaded:', {
        width: video.width,
        height: video.height,
        duration: video.duration,
        isPlaying: video.isPlaying()
    });



    // 设置相机边界
    this.cameras.main.setBounds(0, 0, 16000, 600);
    this.cameras.main.startFollow(player, true, 0.5, 0.5);

    // 添加玩家与地面的碰撞
    this.physics.add.collider(player, grounds);

    // 创建障碍物位置数组
    let currentPos = 800; // 第一个障碍物的起始位置
    const obstaclePositions = [];

    // 生成随机间距的障碍物位置
    while (currentPos < 16000 - 800) { // 预留最后800像素的空间
        obstaclePositions.push(currentPos);
        // 随机间距，最小80，最大300
        const spacing = Phaser.Math.Between(120, 350);
        currentPos += spacing;
    }

    // 玩家的尺寸
    const playerWidth = 30;
    const playerHeight = 40;
    const maxObstacleWidth = playerWidth * 0.7;
    const maxObstacleHeight = playerHeight * 0.7;

    // 建立道具图片数组
    const propImages = ['prop1', 'prop2', 'prop3'];

    // 创建奖励物组
    bonuses = this.physics.add.group({
        allowGravity: false,
        immovable: true
    });

    // 创建障碍物和奖励物
    obstaclePositions.forEach(function (posX, index) {
        // 随机决定是否为棕色障碍物，保持1:2的比例
        const isBrown = Math.random() < 0.33; // 33%的概率是棕色

        // 决定是否放置在地面上（65%的概率）
        const isOnGround = Math.random() < 0.65;

        let posY;
        if (isOnGround) {
            // 放在地面上
            posY = groundLevel - playerHeight;
        } else {
            // 随机高度位置
            const minY = 260; // 玩家可达到的最高位置
            const maxY = groundLevel - playerHeight - 10; // 地面以上
            posY = Phaser.Math.Between(minY, maxY);
        }

        let obstacle;
        if (isBrown) {
            // 棕色障碍物使用刀的图片
            obstacle = this.add.sprite(posX, posY, 'knife');
            obstacle.setScale(0.1); // 调整刀的大小，根据实际图片大小调整这个值
        } else {
            // 绿色障碍物使用随机图片
            const randomObs = Phaser.Math.RND.pick(['obs1', 'obs2', 'obs3']);
            obstacle = this.add.sprite(posX, posY, randomObs);
            obstacle.setScale(0.15);
        }

        this.physics.add.existing(obstacle);
        obstacle.body.setVelocityX(-150);
        obstacle.body.setAllowGravity(false);
        obstacle.body.setImmovable(true);
        obstacle.isBrown = isBrown;
        obstacles.add(obstacle);

        // 随机决定是否在这个障碍物附近创建奖励物（50%概率）
        if (Math.random() < 0.5) {
            // 在障碍物x坐标附近随机位置（±100像素内）
            const bonusX = posX + Phaser.Math.Between(-100, 100);
            // 随机高度，但要在玩家可达范围内 
            const bonusY = Phaser.Math.Between(260, groundLevel - 30);

            // 随机选择一个道具图片
            const randomProp = Phaser.Math.RND.pick(propImages);

            // 创建奖励物精灵（使用随机选的图）
            const bonus = this.add.sprite(bonusX, bonusY, randomProp);
            this.physics.add.existing(bonus);
            bonus.body.setAllowGravity(false);
            bonus.body.setImmovable(true);
            bonus.body.setVelocityX(-150);

            // 调整大小（根据需要调整缩放值）
            bonus.setScale(0.1);

            bonuses.add(bonus);
        }
    }, this);

    // 在障碍物创建完成后，再调用日志函数
    logObstaclePositions.call(this);

    // 添加玩家与障碍物的碰撞检测
    this.physics.add.collider(player, obstacles, (player, obstacle) => {
        if (!player.isInvulnerable) {  // 只有在非无敌状态下才处理碰撞
            hitObstacle(player, obstacle);
        }
    }, null, this);

    // 添加玩家与奖励物的碰撞检测
    this.physics.add.overlap(player, bonuses, collectBonus, null, this);

    // 添加输入控制
    cursors = this.input.keyboard.createCursorKeys();

    // 创建计分板
    scoreText = this.add.text(600, 16, '0', {
        fontSize: '32px',
        fill: '#fff',
        fontFamily: 'Arial'
    });
    scoreText.setScrollFactor(0); // 固定在屏幕上
    scoreText.setDepth(1); // 确保显示在最上层

    // 创建生命条组
    hearts = this.add.group();

    // 创建三个独立的爱心，调整位置确保都能看到
    heart1 = this.add.text(16, 16, '❤️', {
        fontSize: '32px',
        fontFamily: 'Arial'
    });
    heart2 = this.add.text(56, 16, '❤️', {
        fontSize: '32px',
        fontFamily: 'Arial'
    });
    heart3 = this.add.text(96, 16, '❤️', {  // 确保第三颗心的位置正确
        fontSize: '32px',
        fontFamily: 'Arial'
    });

    // 设置UI属性，确保所有心都可见
    heart1.setScrollFactor(0).setDepth(1).setVisible(true);
    heart2.setScrollFactor(0).setDepth(1).setVisible(true);
    heart3.setScrollFactor(0).setDepth(1).setVisible(true);

    // 将所有爱心添加到组中
    hearts.addMultiple([heart1, heart2, heart3]);

    // 现在添加玩家与墙壁的碰撞
    this.physics.add.collider(player, leftWall, () => {
        player.direction = 'right';
    });

    // 添加串口连接按钮
    const connectButton = this.add.text(700, 16, 'connect', {
        fontSize: '20px',
        fill: '#fff',
        backgroundColor: '#ea6952',
        padding: { x: 10, y: 5 }
    })
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .setDepth(1);

    // 添加按钮事件
    connectButton.on('pointerdown', async () => {
        if (!navigator.serial) {
            console.error('Web Serial API not supported');
            return;
        }

        try {
            // 如果已经连接，先断开
            if (serialReader) {
                await serialReader.cancel();
                serialReader = null;
            }
            if (serialPort) {
                await serialPort.close();
                serialPort = null;
            }

            // 请求新的串口连接
            serialPort = await navigator.serial.requestPort();
            await serialPort.open({ baudRate: 9600 });

            // 开始读取数据
            const textDecoder = new TextDecoder();
            const reader = serialPort.readable.getReader();
            serialReader = reader;

            // 读取循环
            const readLoop = async () => {
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) {
                            break;
                        }
                        const text = textDecoder.decode(value);
                        if (text.includes("jump")) {
                            handleSoundJump();
                        }
                    }
                } catch (error) {
                    console.error('Error reading serial:', error);
                } finally {
                    reader.releaseLock();
                }
            };

            // 启动读取循环
            readLoop().catch(console.error);

            // 更新按钮状态
            connectButton.setText('已连接');
            connectButton.setStyle({ backgroundColor: '#008000' });
        } catch (error) {
            console.error('Serial connection error:', error);
            connectButton.setText('连接失败');
            connectButton.setStyle({ backgroundColor: '#ff0000' });
        }
    });
}

function update() {
    if (gameOver) return; // 如果游戏结束，不再更新

    // 确保视频在播放
    if (!player.isPlaying()) {
        player.play(true);
    }
    if (!player.jumpVideo.isPlaying()) {
        player.jumpVideo.play(true);
    }

    // 同步跳跃动画的位置和翻转状态
    player.jumpVideo.x = player.x;
    player.jumpVideo.y = player.y;
    player.jumpVideo.setFlipX(player.flipX);

    // 根据方向翻转视频
    if (player.direction === 'left') {
        player.setFlipX(true);
        player.jumpVideo.setFlipX(true);
        player.body.setVelocityX(-playerSpeed);
    } else {
        player.setFlipX(false);
        player.jumpVideo.setFlipX(false);
        player.body.setVelocityX(playerSpeed);
    }

    // 在地面时重置跳跃状态
    if (player.body.blocked.down) {
        player.isJumping = false;
        player.jumpStage = 0;
        player.setVisible(true);
        player.jumpVideo.setVisible(false);
    }

    // 检查是否超过最大离地高度
    const currentHeightFromGround = groundLevel - player.y;
    if (currentHeightFromGround > maxJumpHeight && player.body.velocity.y < 0) {
        player.body.setVelocityY(0);
    }

    // 更新障碍循环逻辑
    obstacles.children.iterate(function (obstacle) {
        if (obstacle.x + obstacle.width < this.cameras.main.scrollX) {
            obstacle.x += 16000; // 调整为新的世界宽度
        } else if (obstacle.x > this.cameras.main.scrollX + 800) {
            obstacle.x -= 16000; // 调整为新的世界宽度
        }
    }, this);

    // 更新奖励物循环逻辑
    bonuses.children.iterate(function (bonus) {
        if (bonus) {
            if (bonus.x + bonus.width < this.cameras.main.scrollX) {
                bonus.x += 16000; // 调整为新的世界宽度
            } else if (bonus.x > this.cameras.main.scrollX + 800) {
                bonus.x -= 16000; // 调整为新的世界宽度
            }
        }
    }, this);

    // 检查是否到达地图最右端
    if (player.x >= 15900) { // 16000 - 100(留一些余量)
        gameWin();
    }
}

function hitObstacle(player, obstacle) {
    if (obstacle.isBrown && !player.isInvulnerable) {
        // 检查是否还有爱心可以移除
        if (heart3 && heart3.active) {
            heart3.destroy();
        } else if (heart2 && heart2.active) {
            heart2.destroy();
        } else if (heart1 && heart1.active) {
            heart1.destroy();
            endGame();
        }

        // 受伤时不要暂停视频
        player.alpha = 0.5;
        player.isInvulnerable = true;

        currentScene.time.delayedCall(1000, () => {
            player.alpha = 1;
            player.isInvulnerable = false;
        });

        // 在碰撞后立即返回，防止多次处理
        return;
    } else {
        score = Math.max(0, score - 100);
        updateScore();

        // 碰到绿色障碍物改变方向并给予更长的无敌时间
        if (player.direction === 'left') {
            player.direction = 'right';
        } else {
            player.direction = 'left';
        }

        // 添加无敌状态
        if (!player.isInvulnerable) {
            player.isInvulnerable = true;
            player.alpha = 0.5;  // 半透明表示无敌状态

            // 延长无敌时间到1.5秒
            currentScene.time.delayedCall(1200, () => {
                player.alpha = 1;
                player.isInvulnerable = false;
            });
        }
    }
}

// 更新分数显示的全局函数
function updateScore() {
    if (scoreText) {
        scoreText.setText(score.toString()); // 更新分数文本
    } else {
        console.error('scoreText 未正确初始化');
    }
}

// 收集奖励物的函数
function collectBonus(player, bonus) {
    // 如果奖励物已经被收集过，直接返回
    if (bonus.isCollected) return;

    // 标记奖励物已被收集
    bonus.isCollected = true;

    // 添加消失动画
    this.tweens.add({
        targets: bonus,
        alpha: 0,
        scale: 1.2,
        duration: 200,
        onComplete: () => {
            bonus.destroy();
        }
    });

    // 固定加1000分
    const scoreToAdd = 1000;
    score += scoreToAdd;

    // 显示飘分效果，重命名变量为 floatingText，避免与全局 scoreText 冲突
    const floatingText = this.add.text(bonus.x, bonus.y, `+${scoreToAdd}`, {
        fontSize: '24px',
        fill: '#fff',
        stroke: '#000',
        strokeThickness: 4
    });

    // 添加飘分动画
    this.tweens.add({
        targets: floatingText,
        y: bonus.y - 50,
        alpha: 0,
        duration: 1000,
        onComplete: () => {
            floatingText.destroy();
        }
    });

    // 更新分数显示，调用全局的 updateScore 函数
    updateScore();

    // 检查特殊分数节点
    checkSpecialScores();
}

// 检查特殊分数节点
function checkSpecialScores() {
    const specialScores = [6666, 8888, 12222];

    if (specialScores.includes(score)) {
        // 创建祝贺文本
        const congratsText = currentScene.add.text(400, 300, 'Congratulations!', {
            fontSize: '64px',
            fill: '#fff',
            fontFamily: 'Arial',
            backgroundColor: '#fb6d54',
            alpha: 0.8,
            borderRadius: 20,
            padding: { x: 20, y: 10 }
        });
        congratsText.setScrollFactor(0);
        congratsText.setOrigin(0.5);
        congratsText.setDepth(2);

        // 1秒后移除文本
        currentScene.time.delayedCall(1000, () => {
            congratsText.destroy();
        });
    }
}

function logObstaclePositions() {
    console.log('地图障碍物位置:');
    console.log('绿障碍物:');
    obstacles.children.iterate(function (obstacle) {
        if (!obstacle.isBrown) {
            console.log(`x: ${Math.round(obstacle.x)}, y: ${Math.round(obstacle.y)}`);
        }
    });

    console.log('棕色障碍物:');
    obstacles.children.iterate(function (obstacle) {
        if (obstacle.isBrown) {
            console.log(`x: ${Math.round(obstacle.x)}, y: ${Math.round(obstacle.y)}`);
        }
    });

    console.log('奖励物位置:');
    bonuses.children.iterate(function (bonus) {
        if (bonus) {
            console.log(`x: ${Math.round(bonus.x)}, y: ${Math.round(bonus.y)}`);
        }
    });
}

// 添加胜利函数
function gameWin() {
    gameOver = true;

    // 创建半透明白色背景
    const overlay = currentScene.add.rectangle(0, 0, 800, 500, 0xffffff, 0.8)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(9);

    // 显示胜利文本
    const winText = currentScene.add.text(400, 200, 'YOU WIN!', {
        fontSize: '64px',
        fill: '#000',
        fontFamily: 'Arial',
        padding: { x: 20, y: 10 }
    })
        .setScrollFactor(0)
        .setOrigin(0.5)
        .setDepth(10);

    // 显示最终分数
    const finalScore = currentScene.add.text(400, 300, `SCORE: ${score}`, {
        fontSize: '32px',
        fill: '#000',
        fontFamily: 'Arial'
    })
        .setScrollFactor(0)
        .setOrigin(0.5)
        .setDepth(10);

    // 创建重新开始按钮（使用图片）
    const restartButton = currentScene.add.image(400, 450, 'restart')
        .setScrollFactor(0)
        .setDepth(10)
        .setScale(0.3)  // 根据实际图片大小调整缩放
        .setInteractive({ useHandCursor: true });

    // 添加按钮悬停效果
    restartButton.on('pointerover', () => {
        restartButton.setScale(0.33);  // 悬停时稍微放大
    });

    restartButton.on('pointerout', () => {
        restartButton.setScale(0.3);  // 恢复原始大小
    });

    // 添加点击事件
    restartButton.on('pointerdown', () => {
        // 重置全局变量
        score = 0;
        gameOver = false;
        player = null;
        jumpCount = 0;
             
        // 重置分数文本
        if (scoreText) {
            scoreText.setText('0'); // 确保分数文本从0开始
        }
        // 重启场景
        currentScene.scene.restart();
    });
}

// 游戏结束函数
function endGame() {
    gameOver = true;
    cleanupWebSocket();
    currentScene.physics.pause();

    // 创建半透明白色背景
    const overlay = currentScene.add.rectangle(0, 0, 800, 500, 0xffffff, 0.8)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(9);


    // 添加结束视频
    const finalVideo = currentScene.add.video(400, 250, 'gameOverVideo')
        .setScrollFactor(0)
        .setDepth(10)
        .setScale(0.15)
        .setPosition(400, 250) // 调整视频位置
        .play(true); // 循环播放
    // 显示游戏结束图片
    const gameOverImage = currentScene.add.image(400, 100, 'gameover')
        .setScrollFactor(0)
        .setDepth(10)
        .setScale(.9)  // 根据实际图片大小调整缩放
        .setPosition(400, 80);  // 设置游戏结束图片的位置

    // 显示最终分数
    const finalScore = currentScene.add.text(400, 350, `SCORE: ${score}`, {
        fontSize: '28px',
        fill: '#ea6952',
        fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',  // 使用圆润字体
        fontStyle: 'bold',  
        stroke: '#fff',  // 白色描边
        strokeThickness: 4  // 描边宽度

    })
        .setScrollFactor(0)
        .setOrigin(0.5)
        .setPosition(400, 410)
        .setDepth(10);
    // 创建重新开始按钮（使用图片）
    const restartButton = currentScene.add.image(400, 450, 'restart')
        .setScrollFactor(0)
        .setDepth(10)
        .setScale(0.3)  // 根据实际图片大小调整缩放
        .setInteractive({ useHandCursor: true });

    // 添加按钮悬停效果
    restartButton.on('pointerover', () => {
        restartButton.setScale(0.33);  // 悬停时稍微放大
    });

    restartButton.on('pointerout', () => {
        restartButton.setScale(0.3);  // 恢复原始大小
    });

    // 添加点击事件
    restartButton.on('pointerdown', () => {
        // Reset global variables
        score = 0;
        gameOver = false;
        player = null;  // Clear player reference
        jumpCount = 0;
             
        // Reset the score text
        if (scoreText) {
            scoreText.setText('0'); // 确保分数文本从0开始
        }
        // Restart the scene
        currentScene.scene.restart();
    });
}

// 在游戏结束时清理 WebSocket 连接
function cleanupWebSocket() {
    if (gameSocket) {
        gameSocket.close();
        gameSocket = null;
    }
}

// 修改 WebSocket 消息处理函数
function handleWebSocketMessage(event) {
    console.log('收到 WebSocket 消息:', event.data);
    if (event.data === 'jump' && player) {
        console.log('执行跳跃，当前玩家状态:', {
            isJumping: player.isJumping,
            jumpStage: player.jumpStage
        });
        window.triggerJump(player);  // 使用 window.triggerJump
    }
}

// 初始化 WebSocket 连接
function initWebSocket() {
    gameSocket = new WebSocket('ws://localhost:8080');

    gameSocket.onopen = () => {
        console.log('WebSocket 连接成功');
    };

    gameSocket.onmessage = handleWebSocketMessage;

    gameSocket.onerror = (error) => {
        console.error('WebSocket 错误:', error);
    };

    gameSocket.onclose = () => {
        console.log('WebSocket 连接关闭');
    };
}
