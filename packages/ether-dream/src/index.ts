import * as dgram from 'dgram';
import { EtherConn, StreamSourceFn, IPoint } from './EtherConn';
import { twohex } from './parse';
import { Device } from '@laser-dac/core';

const DEFAULT_POINTS_RATE = 30000;

export interface IDevice {
  ip: string;
  port: number;
  name: string;
  hw_revision: number;
  sw_revision: number;
}

export class EtherDream extends Device {
  connection?: EtherConn;

  static _find = function(limit: number, timeout: number): Promise<IDevice[]> {
    const ips: string[] = [];
    const devices: IDevice[] = [];

    const server = dgram.createSocket('udp4');

    return new Promise(resolve => {
      const timeouttimer = setTimeout(function() {
        server.close();
        resolve(devices);
      }, timeout);

      server.on('message', function(msg, rinfo) {
        const ip = rinfo.address;
        if (ips.indexOf(ip) != -1) return;
        ips.push(ip);

        const name =
          'EtherDream @ ' +
          twohex(msg[0]) +
          ':' +
          twohex(msg[1]) +
          ':' +
          twohex(msg[2]) +
          ':' +
          twohex(msg[3]) +
          ':' +
          twohex(msg[4]) +
          ':' +
          twohex(msg[5]);

        devices.push({
          ip: ip,
          port: 7765,
          name: name,
          hw_revision: msg[6],
          sw_revision: msg[7]
        });

        if (devices.length >= limit) {
          server.close();
          clearTimeout(timeouttimer);
          resolve(devices);
        }
      });

      server.bind(7654);

      // wait two seconds for data to come back...
    });
  };

  static find = function() {
    return EtherDream._find(99, 2000);
  };

  static findFirst = function() {
    return EtherDream._find(1, 4000);
  };

  static connect = function(ip: string, port: number) {
    const conn = new EtherConn();
    return conn
      .connect(
        ip,
        port
      )
      .then(success => (success ? conn : null));
  };

  async search() {
    const manualAddress = process.env.ETHER_ADDRESS;
    if (manualAddress) {
      const [ip, port] = manualAddress.split(':');
      return { ip, port: parseInt(port) } as IDevice;
    } else {
      const devices = await EtherDream.findFirst();
      if (!devices.length) {
        throw new Error('No Etherdream device found on network.');
      }
      return devices[0];
    }
  }

  async start() {
    const device = await this.search();
    const conn = await EtherDream.connect(
      device.ip,
      device.port
    );
    if (!conn) {
      throw new Error(
        `Could not connect to device on ${device.ip}:${device.port}`
      );
    }
    this.connection = conn;
    return true;
  }

  stop() {
    if (this.connection) {
      this.connection.sendStop(() => null);
    }
  }

  stream(
    scene: { points: IPoint[] },
    pointsRate: number = DEFAULT_POINTS_RATE
  ) {
    if (!this.connection) {
      throw new Error('Call start() first');
    }
    this.connection.streamFrames(pointsRate, callback => {
      callback(scene.points);
    });
  }
}

export { EtherConn, StreamSourceFn, IPoint };
