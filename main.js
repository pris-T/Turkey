// main.js

const config = {
    type: Phaser.AUTO,
    width: 800,     // 游戏画布宽度
    height: 600,    // 修改为600
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 }, // 设置重力
            debug: false          // 是否开启调试模式
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

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
    // 不需要加载任何资源
}

function create() {
    // 在create开始时保存场景引用
    currentScene = this;

    // 设置更大的世界边界
    this.physics.world.setBounds(0, 0, 16000, 600); // 从8000增加到16000
    
    // 调整背景以适应新的世界大小       
    background = this.add.graphics();
    background.fillStyle(0x87CEEB, 1);
    background.fillRect(0, 0, 16000, 600);
    
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

    // 创建玩家
    player = this.add.rectangle(100, groundLevel - 60, 40, 60, 0xff0000); // 修改Y坐标
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    player.direction = 'right';
    player.isInvulnerable = false;  // 初始化无敌状态为false

    // 在玩家左侧创建固定的绿色障碍物
    var startObstacle = this.add.rectangle(50, groundLevel - 80, 40, 80, 0x228B22); // 修改Y坐标
    this.physics.add.existing(startObstacle);
    startObstacle.body.setAllowGravity(false);
    startObstacle.body.setImmovable(true);
    startObstacle.isBrown = false;
    obstacles.add(startObstacle);

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
        const spacing = Phaser.Math.Between(80, 300);
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
        const width = Phaser.Math.Between(20, maxObstacleWidth);
        const height = Phaser.Math.Between(20, maxObstacleHeight);

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

    // 在所有障碍物创建完成后，再调用日志函数
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
}

function update() {
    if (gameOver) return; // 如果游戏结束，不再更新

    // 在地面时重置跳跃次数
    if (player.body.blocked.down) {
        jumpCount = 0;
    }

    // 检测跳跃输入
    if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
        if (jumpCount < 2) {
            if (jumpCount == 0) {
                // 第一次跳跃，跳150像素
                player.body.setVelocityY(-550);
            } else if (jumpCount == 1) {
                // 第二次跳跃，总共跳300像素
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

    // 更新障碍物循环逻辑
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

    // 控制玩家自动移动
    const playerSpeed = 100; // 降低玩家速度

    if (player.direction === 'left') {
        player.body.setVelocityX(-playerSpeed);
    } else {
        player.body.setVelocityX(playerSpeed);
    }
}

function hitObstacle(player, obstacle) {
    // 如果玩家处于无敌状态，直接返回
    if (player.isInvulnerable) return;

    if (obstacle.isBrown) {
        // 检查是否还有爱心可以移除
        if (heart2 && heart2.active) {
            // 如果第二个心还在，移除它
            heart2.destroy();
        } else if (heart1 && heart1.active) {
            // 如果只剩第一个心，移除它并结束游戏
            heart1.destroy();
            endGame();
        }

        // 给玩家一个短暂的无敌时间，防止连续碰撞
        player.alpha = 0.5;  // 半透明表示受伤
        player.isInvulnerable = true;  // 标记为无敌状态
        
        currentScene.time.delayedCall(1000, () => {
            player.alpha = 1;  // 1秒后恢复正常
            player.isInvulnerable = false;  // 移除无敌状态
        });

        // 在碰撞后立即返回，防止多次处理
        return;
    } else {
        // 绿色障碍物处理
        score = Math.max(0, score - 100);
        updateScore();
        
        // 碰到绿色障碍物改变方向
        if (player.direction === 'left') {
            player.direction = 'right';
        } else {
            player.direction = 'left';
        }

        // 添加短暂无敌时间
        player.alpha = 0.6;  // 半透明表示受伤
        player.isInvulnerable = true;  // 标记为无敌状态
        
        currentScene.time.delayedCall(600, () => {  // 使用500毫秒的无敌时间
            player.alpha = 1;  // 恢复正常
            player.isInvulnerable = false;  // 移除无敌状态
        });
    }
}

// 收集奖励物的函数
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
            padding: { x: 20, y: 10 }
        });
        currentScene.time.delayedCall(1500, () => {
            congratsText.destroy();
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
