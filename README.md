# Little Turkey Adventure

**Little Turkey Adventure** is a browser-based interactive 2D game where players control a 2d turkey using their voice.
The game uses an Arduino sound sensor to detect volume input, allowing players to jump and interact with the game environment purely through sound. It was created as an experimental project combining hardware input and creative gameplay.

This project explores the intersection of hardware and browser-based game logic, demonstrating responsive real-time interaction through sensor-driven input.

---

## Features

- Voice-controlled jump: player jumps based on volume detected via Arduino sound-sensor
- Auto-move & collision: character moves automatically, reverses on wall contact
- Level progression: automatic generating level
- Stylized visuals: humorous visuals with hand-drawn turkey and kitchen maze
- Browser-based interface with sound sensor connection via Web Serial API

---

## Technologies Used

| Tool           | Purpose                             |
|----------------|-------------------------------------|
| **Arduino**    | Collecting sound input (volume)     |
| **JavaScript** | Browser logic & interaction         |
| **Web Serial API** | Connect Arduino to browser    |
| **HTML/CSS**   | Interface & basic structure         |

---

##  My Contributions

- Designed and implemented the **input system** using Arduino sound sensors by using C++
- Built the **serial data communication** pipeline (Arduino → JS via Web Serial API)
- Programmed the **jump logic** and **collision detection**
- Contributed to level design, interaction flow, and visual layout
- Collaborated with team members on UI and debugging

---

## Demo Video
[Watch the Demo](#)  
*(https://www.youtube.com/watch?v=9o9zZP1ZsTY)*

---

## Folder Structure
/final-one
│
├── arduino/ # Arduino sketch code (.ino)
├── js/ # JavaScript game logic (p5.js)
├── assets/ # Images and background visuals
├── index.html # Main game file
└── README.md 

---

## How to Run the Project

1. Upload `sound_sensor.ino` to your Arduino
2. Open `index.html` in **Google Chrome**
3. Click the **Connect** button to access the Web Serial API
4. Make sounds like 'AH' to control the turkey to jump
5. Enjoy the game!

You can also follow the instruction:
Arduino IDE
1.download Node.js
2.win+R cmd
3.npm install -g http-server
4.confirm Node.js = install: node -v npm -v
5.npm: npm install
6.http-server (check http://localhost:8080）
7.web serial API：chrome://flags



> Make sure your browser supports Web Serial API (Chrome recommended).

---












