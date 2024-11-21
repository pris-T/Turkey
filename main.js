// main.js

const playerSpeed = 100; // 全局常量，玩家移动速度

const config = {
    type: Phaser.AUTO,
    width: 800,     // 游戏画布宽度
    height: 600,    // 修改为600
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 }, // 设置重力
            debug: true          // 改为 true
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
let score = 0;
let hearts;
let heart1;
let heart2;
let gameOver = false;
let currentScene; // 添加这个变量来存储场景引用

function preload() {
    // 加载视频
    this.load.video('playerVideo', 'assets/Run.webm', 'loadeddata', false, true);
    this.load.video('jumpVideo', 'assets/Jump.webm', 'loadeddata', false, true);
    // 加载背景图片
    this.load.image('background', 'assets/background.jpg');
}

function create() {
    // 在create开始时保存场景引用
    currentScene = this;

    // 设置更大的世界边界
    this.physics.world.setBounds(0, 0, 16000, 600);
    
    // 创建左侧墙壁
    const wallWidth = 40;  // 墙壁宽度
    const wallHeight = 600;  // 墙壁高度
    const leftWall = this.add.rectangle(0, 0, wallWidth, wallHeight, 0x228B22)
        .setOrigin(0, 0);
    
    // 添加物理属性
    this.physics.add.existing(leftWall, true); // true表示静态物体
    // 添加背景图片
    const bg = this.add.image(0, 0, 'background')
        .setOrigin(0, 0)
        .setScrollFactor(0);
    
    // 调整背景图片大小以适应屏幕
    bg.setDisplaySize(800, 600);
    // 移除或注释掉原来的背景绘制代码
    // background = this.add.graphics();
    // background.fillStyle(0x87CEEB, 1);
    // background.fillRect(0, 0, 16000, 600);
    
    // 创建更多地面片段
    grounds = this.physics.add.staticGroup();
    for (let i = 0; i < 40; i++) { // 从20增加到40个地块
        const ground = this.add.rectangle(i * 400, groundLevel, 400, 40, 0x228B22).setOrigin(0, 0);
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
    video.setScale(40/video.width, 50/video.height);
    jumpVideo.setScale(40/jumpVideo.width, 50/jumpVideo.height);
    
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
    
    // 保存引用
    player = video;
    player.jumpVideo = jumpVideo;
    player.direction = 'right';

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
        const spacing = Phaser.Math.Between(90, 300);
        currentPos += spacing;   
    }  
    
    // 玩家的尺寸
    const playerWidth = 40;
    const playerHeight = 60;
    const maxObstacleWidth = playerWidth * 0.7;
    const maxObstacleHeight = playerHeight * 0.7;

    // 创建奖励物组
    bonuses = this.physics.add.group({
        allowGravity: false,
        immovable: true
    });

    // 创建障碍物和奖励物
    obstaclePositions.forEach(function (posX, index) {
        // 随机决定是否为棕色障碍物，保持1:2的比例
        const isBrown = Math.random() < 0.33; // 33%的概率是棕色
        const color = isBrown ? 0x8B4513 : 0x228B22; // 棕色或绿色

        // 随机尺寸（但不超过玩家的70%）
        const width = Phaser.Math.Between(playerWidth * 0.5, playerWidth * 0.8);
        const height = Phaser.Math.Between(playerHeight * 0.5, playerHeight * 0.8);

        // 决定是否放置在地面上（65%的概率）
        const isOnGround = Math.random() < 0.65;
        
        let posY;
        if (isOnGround) {
            // 放在地面上
            posY = groundLevel - height;
        } else {
            // 随机高度位置
            const minY = 260; // 玩家可达到的最高位置
            const maxY = groundLevel - height - 10; // 地面以上
            posY = Phaser.Math.Between(minY, maxY); 
        }

        const obstacle = this.add.rectangle(posX, posY, width, height, color);
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
            
            // 创建黄色圆形奖励物
            const bonus = this.add.circle(bonusX, bonusY, 15, 0xFFFF00);
            this.physics.add.existing(bonus);
            bonus.body.setAllowGravity(false);
            bonus.body.setImmovable(true);
            bonus.body.setVelocityX(-150);
            bonuses.add(bonus);
        }
    }, this);

    // 在所障碍物创建完成后，再调用日志函数
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
    scoreText = this.add.text(700, 16, '0', { 
        fontSize: '32px', 
        fill: '#fff',
        fontFamily: 'Arial'
    });
    scoreText.setScrollFactor(0); // 固定在屏幕上
    scoreText.setDepth(1); // 确保显示在最上层

    // 创建生命条组
    hearts = this.add.group();
    
    // 创建两个独立的爱心
    heart1 = this.add.text(16, 16, '❤️', { 
        fontSize: '32px',
        fontFamily: 'Arial'
    });
    heart2 = this.add.text(56, 16, '❤️', { 
        fontSize: '32px',
        fontFamily: 'Arial'
    });

    // 设置UI属性
    heart1.setScrollFactor(0);
    heart2.setScrollFactor(0);
    heart1.setDepth(1);
    heart2.setDepth(1);

    // 将爱心添加到组中
    hearts.add(heart1);
    hearts.add(heart2);

    // 现在添加玩家与墙壁的碰撞
    this.physics.add.collider(player, leftWall, () => {
        player.direction = 'right';
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

    // 在地面时重置跳跃次数
    if (player.body.blocked.down) {
        jumpCount = 0;
        // 确保在地面时显示跑步动画
        player.setVisible(true);
        player.jumpVideo.setVisible(false);
    }

    // 检测跳跃输入
    if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
        if (jumpCount < 2) {
            // 切换到跳跃动画
            player.setVisible(false);
            player.jumpVideo.setVisible(true);
            
            if (jumpCount == 0) {
                player.body.setVelocityY(-550);
            } else if (jumpCount == 1) {
                player.body.setVelocityY(-775);      
            }
            jumpCount++;
        }
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

    // 更新奖励物循环逻
    bonuses.children.iterate(function (bonus) {
        if (bonus) {
            if (bonus.x + bonus.width < this.cameras.main.scrollX) {
                bonus.x += 16000; // 调整为新的世界宽度
            } else if (bonus.x > this.cameras.main.scrollX + 800) {
                bonus.x -= 16000; // 调整为新的世界宽度
            }
        }
    }, this);

    // 添加这行来显示碰撞箱（仅调试用）
    // this.physics.world.drawDebug = true;
}

function hitObstacle(player, obstacle) {
    if (obstacle.isBrown && !player.isInvulnerable) {
        // 检查是否还有爱心可以移除
        if (heart2 && heart2.active) {
            // 如果第二个心还在，移除它
            heart2.destroy();
        } else if (heart1 && heart1.active) {
            // 如果只剩第一个心，移除它并结束游戏
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

// 收奖励物的函数
function collectBonus(player, bonus) {
    // 移除奖励物
    bonus.destroy();
    
    // 增加分数
    score += 1000;
    updateScore();
    
    // 检查是否达到胜利条件
    checkWinCondition();
}

function logObstaclePositions() {
    console.log('地图障碍物位置:');
    console.log('绿色障碍物:');
    obstacles.children.iterate(function(obstacle) {
        if (!obstacle.isBrown) {
            console.log(`x: ${Math.round(obstacle.x)}, y: ${Math.round(obstacle.y)}`);
        }
    });
    
    console.log('棕色障碍物:');
    obstacles.children.iterate(function(obstacle) {
        if (obstacle.isBrown) {
            console.log(`x: ${Math.round(obstacle.x)}, y: ${Math.round(obstacle.y)}`);
        }
    });

    console.log('奖励物位置:');
    bonuses.children.iterate(function(bonus) {
        if (bonus) {
            console.log(`x: ${Math.round(bonus.x)}, y: ${Math.round(bonus.y)}`);
        }
    });
}

// 检测玩家跳跃高度的函数（可选）
function checkJumpHeight(player) {
    let jumpHeight = groundLevel - player.y; 
    if (player.body.velocity.y < 0 && jumpHeight > 0) {
        console.log(`当前跳跃高度: ${Math.round(jumpHeight)} 像素`);
    }
}

// 更新分数显示
function updateScore() {
    scoreText.setText(score.toString());
}

// 检查胜利条件
function checkWinCondition() {
    if (score >= 6666 && !gameOver) {
        const congratsText = currentScene.add.text(400, 300, 'Congratulations!', {
            fontSize: '64px',
            fill: '#fff',
            fontFamily: 'Arial',
            backgroundColor: '#000',
            padding: { x: 20, y: 10 }
        });
        congratsText.setScrollFactor(0);
        congratsText.setOrigin(0.5);
        congratsText.setDepth(2);
    }
}

// 游戏结束函数
function endGame() {
    gameOver = true;
    currentScene.physics.pause();
    player.fillColor = 0x000000;
    const gameOverText = currentScene.add.text(400, 300, '游戏结束', { 
        fontSize: '32px', 
        fill: '#fff',
        fontFamily: 'Arial'
    });
    gameOverText.setScrollFactor(0);
    gameOverText.setOrigin(0.5);
    gameOverText.setDepth(2);
}
