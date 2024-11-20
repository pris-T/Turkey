from PIL import Image
import json

# 图片路径
input_path = 'assets/run.gif'  # 修改为你的图片路径
output_path = 'run.gif'  # 输出的GIF图片路径
json_path = 'run.json'  # JSON文件路径

# 打开GIF图片
image = Image.open(input_path)

# 获取GIF信息
n_frames = 0  # 帧数
frame_duration = []  # 每帧持续时间（毫秒）

try:
    while True:
        # 获取当前帧的持续时间（转换为毫秒）
        duration = image.info.get('duration', 100)  # 默认100ms
        frame_duration.append(duration)
        n_frames += 1
        image.seek(image.tell() + 1)
except EOFError:
    pass  # 到达GIF末尾

# 计算平均帧率（fps）
average_duration = sum(frame_duration) / len(frame_duration)
fps = 1000 / average_duration  # 转换为fps

# 保存图片
image.seek(0)  # 回到第一帧
image.save(output_path, format='GIF')

# 获取图片信息
info = {
    "original_format": image.format,  # 原始格式
    "output_format": "GIF",  # 输出格式
    "size": image.size,  # 图片尺寸
    "n_frames": n_frames,  # 总帧数
    "frame_duration": frame_duration,  # 每帧持续时间
    "average_fps": round(fps, 2)  # 平均帧率（四舍五入到2位小数）
}

# 写入JSON文件
with open(json_path, 'w') as f:
    json.dump(info, f, indent=4)

print(f"转换完成，GIF已保存到{output_path}")
print(f"总帧数: {n_frames}")
print(f"平均帧率: {round(fps, 2)} fps")
print(f"详细信息已保存到{json_path}")