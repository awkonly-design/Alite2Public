/*!
 * @file tlc59711_drv.cpp
 *
 * Local copy of Adafruit_TLC59711 1.3.4, see tlc59711_drv.h for changes.
 *
 * @mainpage Adafruit TLC59711 PWM/LED driver
 *
 * @section intro_sec Introduction
 *
 * This is a library for our Adafruit 12-channel PWM/LED driver
 *
 * Pick one up today in the adafruit shop!
 * ------> http://www.adafruit.com/products/1455
 *
 * Two SPI Pins are required to send data: clock and data pin.
 *
 * Adafruit invests time and resources providing this open source code,
 * please support Adafruit and open-source hardware by purchasing
 * products from Adafruit!
 *
 * @section author Author
 *
 * Written by Limor Fried/Ladyada for Adafruit Industries.
 *
 * @section license License
 *
 * BSD license, all text above must be included in any redistribution
 */

#include "tlc59711_drv.h"

/*!
 *  @brief  Instantiates a new Adafruit_TLC59711 class on its own hardware SPI
 *          bus (TLC59711_SPI_BUS), routed to the given pins
 *  @param  n
 *          number of connected drivers
 *  @param  c
 *          clock pin
 *  @param  d
 *          data pin
 */
Adafruit_TLC59711::Adafruit_TLC59711(uint8_t n, uint8_t c, uint8_t d) {
  numdrivers = n;

  BCr = BCg = BCb = 0x7F; // default 100% brigthness

  pwmbuffer = (uint16_t *)calloc(2, 12 * n);
  frame = (uint8_t *)calloc(TLC59711_FRAME_BYTES, n);
  lastframe = (uint8_t *)calloc(TLC59711_FRAME_BYTES, n);

  _clk = c;
  _dat = d;
  _spi = new SPIClass(TLC59711_SPI_BUS);
}

/*!
 *  @brief  Instantiates a new Adafruit_TLC59711 class using provided SPI
 *          (the caller has already called theSPI->begin())
 *  @param  n
 *          number of connected drivers
 *  @param  *theSPI
 *          spi object
 */
Adafruit_TLC59711::Adafruit_TLC59711(uint8_t n, SPIClass *theSPI) {
  numdrivers = n;

  BCr = BCg = BCb = 0x7F; // default 100% brigthness

  pwmbuffer = (uint16_t *)calloc(2, 12 * n);
  frame = (uint8_t *)calloc(TLC59711_FRAME_BYTES, n);
  lastframe = (uint8_t *)calloc(TLC59711_FRAME_BYTES, n);

  _spi = theSPI;
}

/*!
 *  @brief  Writes PWM buffer to board.
 *          The whole chain is sent in one hardware SPI transfer (<= 64 bytes
 *          fits the SPI data buffer), so SCKI never pauses mid-frame.
 *          An unchanged frame is skipped unless TLC59711_REFRESH_MS has passed.
 *  @param  force
 *          send even if the frame is unchanged
 */
void Adafruit_TLC59711::write(bool force) {
  uint32_t command;

  if (!pwmbuffer || !frame || !lastframe || !_spi)
    return;

  // Magic word for write
  command = 0x25;

  command <<= 5;
  // OUTTMG, EXTGCK, TMGRST, DSPRPT, BLANK (upstream default 1,0,1,1,0 -> 0x16)
  command |= (TLC59711_OUTTMG << 4) | (TLC59711_EXTGCK << 3) |
             (TLC59711_TMGRST << 2) | (TLC59711_DSPRPT << 1) | TLC59711_BLANK;

  command <<= 7;
  command |= BCr;

  command <<= 7;
  command |= BCg;

  command <<= 7;
  command |= BCb;

  uint8_t *p = frame;
  for (uint8_t n = 0; n < numdrivers; n++) {
    *p++ = command >> 24;
    *p++ = command >> 16;
    *p++ = command >> 8;
    *p++ = command;

    // 12 channels per TLC59711
    for (int8_t c = 11; c >= 0; c--) {
      // 16 bits per channel, send MSB first
      *p++ = pwmbuffer[n * 12 + c] >> 8;
      *p++ = pwmbuffer[n * 12 + c];
    }
  }

  size_t len = TLC59711_FRAME_BYTES * numdrivers;
  uint32_t now = millis();

  if (!force && sent && memcmp(frame, lastframe, len) == 0 &&
      (now - last_ms) < TLC59711_REFRESH_MS)
    return;

  _spi->beginTransaction(SPISettings(TLC59711_SPI_FREQ, MSBFIRST, SPI_MODE0));
  _spi->writeBytes(frame, len);
  _spi->endTransaction();

  // the TLC59711 latches after SCKI stays idle for 8 clock periods;
  // keep the next frame from starting before that
  delayMicroseconds(10);

  memcpy(lastframe, frame, len);
  sent = true;
  last_ms = now;
}

/*!
 *  @brief  Set PWM value on selected channel
 *  @param  chan
 *          one from 12 channel (per driver) so there is 12 * number of drivers
 *  @param  pwm
 *          pwm value
 */
void Adafruit_TLC59711::setPWM(uint16_t chan, uint16_t pwm) {
  if (chan >= 12 * numdrivers)
    return;
  pwmbuffer[chan] = pwm;
}

/*!
 *  @brief  Set RGB value for selected LED
 *  @param  lednum
 *          selected LED number that for which value will be set
 *  @param  r
 *          red value
 *  @param g
 *          green value
 *  @param b
 *          blue value
 */
void Adafruit_TLC59711::setLED(uint8_t lednum, uint16_t r, uint16_t g,
                               uint16_t b) {
  setPWM(lednum * 3, r);
  setPWM(lednum * 3 + 1, g);
  setPWM(lednum * 3 + 2, b);
}

/*!
 *  @brief  Get RGB value for selected LED
 *  @param  lednum
 *          selected LED number that for which value will be set
 *  @param  r
 *          red value
 *  @param g
 *          green value
 *  @param b
 *          blue value
 */
void Adafruit_TLC59711::getLED(uint8_t lednum, uint16_t &r, uint16_t &g,
                               uint16_t &b) {
  r = pwmbuffer[lednum * 3];
  g = pwmbuffer[lednum * 3 + 1];
  b = pwmbuffer[lednum * 3 + 2];
}

/*!
 *  @brief  Set the brightness of LED channels to same value
 *  @param  BC
 *          Brightness Control value
 */
void Adafruit_TLC59711::simpleSetBrightness(uint8_t BC) {
  if (BC > 127) {
    BC = 127; // maximum possible value since BC can only be 7 bit
  } else if (BC < 0) {
    BC = 0;
  }

  BCr = BCg = BCb = BC;
}

/*!
 *  @brief  Set the brightness of LED channels to specific value
 *  @param  bcr
 *          Brightness Control Red value
 *  @param  bcg
 *          Brightness Control Green value
 *  @param  bcb
 *          Brightness Control Blue value
 */
void Adafruit_TLC59711::setBrightness(uint8_t bcr, uint8_t bcg, uint8_t bcb) {
  if (bcr > 127) {
    bcr = 127; // maximum possible value since BC can only be 7 bit
  } else if (bcr < 0) {
    bcr = 0;
  }

  BCr = bcr;

  if (bcg > 127) {
    bcg = 127; // maximum possible value since BC can only be 7 bit
  } else if (bcg < 0) {
    bcg = 0;
  }

  BCg = bcg;

  if (bcb > 127) {
    bcb = 127; // maximum possible value since BC can only be 7 bit
  } else if (bcb < 0) {
    bcb = 0;
  }

  BCb = bcb;
}

/*!
 *  @brief  Begins SPI connection if there is not empty PWM buffer
 *  @return If successful returns true, otherwise false
 */
bool Adafruit_TLC59711::begin() {
  if (!pwmbuffer || !frame || !lastframe || !_spi)
    return false;

  if (_clk >= 0)
    _spi->begin(_clk, -1, _dat, -1); // SCK, MISO (unused), MOSI, SS (unused)

  return true;
}
