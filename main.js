// main.js

const config = {
    type: Phaser.AUTO,
    width: 800,     // 游戏画布宽度
    height: 450,    // 游戏画布高度
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
let jumpCount = 0; // 新增：跳跃次数计数器
let lastSpaceTime = 0;  // 用于记录上次按空格的时间
const doubleJumpWindow = 100;  // 双击判定的时间窗口（毫秒）
const maxJumpHeight = 900;  // 最大离地高度
const groundLevel = 580;   // 地面的Y坐标
let bonuses;  // 奖励物组
   
function preload() {
    // 不需要加载任何资源
}
 
function create() {
    // 设置更大的世界边界
    this.physics.world.setBounds(0, 0, 8000, 600); // 扩大到8000
    
    // 调整背景以适应新的世界大小
    background = this.add.graphics();
    background.fillStyle(0x87CEEB, 1);
    background.fillRect(0, 0, 8000, 600);
    
    // 创建更多地面片段
    grounds = this.physics.add.staticGroup();
    for (var i = 0; i < 20; i++) { // 增加到20个地块
        var ground = this.add.rectangle(i * 400, 580, 400, 40, 0x228B22).setOrigin(0, 0);
        this.physics.add.existing(ground, true);
        grounds.add(ground);
    }

    // 创建障碍物组（移到前面）
    obstacles = this.physics.add.group({
        allowGravity: false,
        immovable: true
    });

    // 创建玩家
    player = this.add.rectangle(100, 500, 40, 60, 0xff0000);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    player.direction = 'right';

    // 在玩家左侧创建固定的绿色障碍物
    var startObstacle = this.add.rectangle(50, 550, 40, 80, 0x228B22);
    this.physics.add.existing(startObstacle);
    startObstacle.body.setAllowGravity(false);
    startObstacle.body.setImmovable(true);
    startObstacle.isBrown = false;
    obstacles.add(startObstacle);

    // 设置相机边界
    this.cameras.main.setBounds(0, 0, 8000, 600);
    this.cameras.main.startFollow(player, true, 0.5, 0.5);

    // 添加玩家与地面的碰撞
    this.physics.add.collider(player, grounds);

    // 创建障碍物位置数组
    let currentPos = 800; // 第一个障碍物的起始位置
    const obstaclePositions = [];
    
    // 生成随机间距的障碍物位置
    while (currentPos < 8000 - 300) { // 预留最后800像素的空间
        obstaclePositions.push(currentPos);
        // 随机间距，最小300，最大800  
        const spacing = Phaser.Math.Between(80, 300);
        currentPos += spacing;   
    }
    
    // 玩家的尺寸
    const playerWidth = 40;
    const playerHeight = 60;
    const maxObstacleWidth = playerWidth * 0.7;
    const maxObstacleHeight = playerHeight * 0.7;

    // 创建奖励物组（在创建障碍物之前）
    bonuses = this.physics.add.group({
        allowGravity: false,
        immovable: true
    });

    // 创建障碍物和奖励物
    obstaclePositions.forEach(function (posX, index) {
        // 随机决定是否为棕色障碍物，保持1:2的比例
        const isBrown = Math.random() < 0.40; // 40%的概率是棕色
        const color = isBrown ? 0x8B4513 : 0x228B22; // 棕色或绿色

        // 随机尺寸（但不超过玩家的70%）
        const width = Phaser.Math.Between(20, maxObstacleWidth);
        const height = Phaser.Math.Between(20, maxObstacleHeight);

        // 决定是否放置在地面上（45%的概率）
        const isOnGround = Math.random() < 0.65;
        
        let posY;
        if (isOnGround) {
            // 放在地面上
            posY = 580 - height; // 地面Y坐标是580
        } else {
            // 随机高度位置
            const minY = 580 - height; // 最低位置
            const maxY = 400; // 最高位置
            posY = Phaser.Math.Between(maxY, minY - 10); // 减去50确保不会太靠近地面
        }
   
        const obstacle = this.add.rectangle(posX, posY, width, height, color);
        this.physics.add.existing(obstacle);
        obstacle.body.setVelocityX(-150);
        obstacle.body.setAllowGravity(false);
        obstacle.body.setImmovable(true);
        obstacle.isBrown = isBrown; // 标记障碍物类型
        obstacles.add(obstacle);

        // 随机决定是否在这个障碍物附近创建奖励物（50%概率）
        if (Math.random() < 0.5) {
            // 在障碍物x坐标附近随机位置（±100像素内）
            const bonusX = posX + Phaser.Math.Between(-100, 100);
            // 随机高度，但要在合理范围内 
            const bonusY = Phaser.Math.Between(100, 300);     
            
            // 创建黄色圆形奖励物
            const bonus = this.add.circle(bonusX, bonusY, 15, 0xFFFF00);
            this.physics.add.existing(bonus);
            bonus.body.setAllowGravity(false);
            bonus.body.setImmovable(true);
            bonus.body.setVelocityX(-150); // 与障碍物相同的速度
            bonuses.add(bonus);
        }
    }, this);

    // 在所有障碍物创建完成后，再调用日志函数
    logObstaclePositions.call(this);

    // 添加玩家与障碍物的碰撞检测
    this.physics.add.collider(player, obstacles, hitObstacle, null, this);

    // 添加玩家与奖励物的碰撞检测
    this.physics.add.overlap(player, bonuses, collectBonus, null, this);

    // 添加输入控制
    cursors = this.input.keyboard.createCursorKeys();
}

function update() {
    // 在地面时重置跳跃次数
    if (player.body.blocked.down) {
        jumpCount = 0;
    }

    // 检测跳跃输入
    if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
        const currentTime = new Date().getTime();
        
        // 只有在跳跃次数小于2时才允许跳跃
        if (jumpCount < 2) {
            if (currentTime - lastSpaceTime < doubleJumpWindow) {
                // 双击空格，高跳
                player.body.setVelocityY(-1000);
            } else {
                // 单击空格，普通跳
                player.body.setVelocityY(-500);
            } 
            jumpCount++; // 增加跳跃次数
        }
        
        lastSpaceTime = currentTime;
    }

    // 检查是否超过最大离地高度
    const currentHeightFromGround = groundLevel - player.y;
    if (currentHeightFromGround > maxJumpHeight && player.body.velocity.y < 0) {
        player.body.setVelocityY(0);
    }

    // 更新障碍物循环逻辑
    obstacles.children.iterate(function (obstacle) {
        // 根据相机视图来判断是否需要重置位置
        if (obstacle.x + obstacle.width < this.cameras.main.scrollX) {
            obstacle.x += 8000; // 调整为新的世界宽度
        } else if (obstacle.x > this.cameras.main.scrollX + 800) {
            obstacle.x -= 8000; // 调整为新的世界宽度
        }
    }, this);

    // 更新奖励物循环逻辑
    bonuses.children.iterate(function (bonus) {
        if (bonus) {  // 确保奖励物存在
            // 根据相机视图来判断是否需要重置位置
            if (bonus.x + bonus.width < this.cameras.main.scrollX) {
                bonus.x += 8000; // 调整为新的世界宽度
            } else if (bonus.x > this.cameras.main.scrollX + 800) {
                bonus.x -= 8000; // 调整为新的世界宽度
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
    if (obstacle.isBrown) {
        // 碰到棕色障碍物，游戏结束
        this.physics.pause(); // 暂停物理引擎
        player.fillColor = 0x000000; // 玩家变黑
        const gameOverText = this.add.text(600, 300, '游戏结束', { fontSize: '32px', fill: '#fff' });
        gameOverText.setOrigin(0.5);
    } else {
        // 碰到绿色障碍物，反转玩家方向
        if (player.direction === 'left') {
            player.direction = 'right';
        } else {
            player.direction = 'left';
        }
    }
}

// 收集奖励物的函数
function collectBonus(player, bonus) {
    // 移除奖励物
    bonus.destroy();
    
    // 这里可以添加得分、音效等效果
    console.log('收集到奖励物！');
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
