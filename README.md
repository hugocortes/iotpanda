# iotpanda
Simple Cayenne connected Panda

## Required Hardware
Comma AI Panda (grey or white):
https://shop.comma.ai/products/panda-obd-ii-dongle

USB Type A to Type A cable

## Running
1. Create .env following .env.example
2. `npm install`
3. `node index.js`
  * Note: `sudo` may be needed to access USB

## Useful
Vehicle PIDs: https://en.wikipedia.org/wiki/OBD-II_PIDs#Mode_01
Vehicle DBCs: https://github.com/commaai/opendbc
Vehicle CAN Bus reader: https://community.comma.ai/cabana/

If vehicle is not listed, CAN capture will be needed to find which address and which bytes from buffer are used for car sensor.
