import { Simulator } from '@ether-dream/simulator';
import { Scene, Rect } from '@ether-dream/draw';
import { Ball } from './Ball';

const FRAME_RATE = 15;
const POINTS_RATE = 30000;
const NUMBER_OF_BALLS = 5;

(async () => {
  const simulator = new Simulator();
  await simulator.start({ device: !!process.env.DEVICE });

  const balls: Ball[] = [];
  for (let i = 0; i < NUMBER_OF_BALLS; i++) {
    balls.push(
      new Ball({
        x: 0.5,
        y: 0.5,
        radius: Math.random() / 5 + 0.05
      })
    );
  }

  let scene = new Scene();
  function updateDots() {
    scene = new Scene({
      resolution: 100
    });

    const bounds = new Rect({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      color: [0, 1, 0]
    });
    scene.add(bounds);

    balls.forEach(ball => {
      ball.update();
      scene.add(ball.draw());
    });
  }

  let currentPointId = 0;

  simulator.streamPoints(POINTS_RATE, (numpoints, callback) => {
    const streamPoints = [];
    const pointsBuffer = scene.points;

    if (pointsBuffer.length) {
      for (var i = 0; i < numpoints; i++) {
        currentPointId++;
        currentPointId %= pointsBuffer.length;

        streamPoints.push(pointsBuffer[currentPointId]);
      }
    }
    callback(streamPoints);
  });

  setInterval(updateDots, FRAME_RATE);
})();