import { Logger } from '@nestjs/common';
import { createTransport } from 'nodemailer';

import { SmtpDriver } from 'src/engine/core-modules/email/drivers/smtp.driver';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('SmtpDriver delivery acknowledgement', () => {
  const message = {
    from: 'notifications@example.invalid',
    to: 'owner@example.invalid',
    subject: 'Synthetic acknowledgement test',
    text: 'No network delivery',
  };
  const sendMail = jest.fn();
  let driver: SmtpDriver;
  let log: jest.SpyInstance;
  let errorLog: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    driver = new SmtpDriver({ host: 'smtp.example.invalid', port: 465 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('waits for SMTP acknowledgement before resolving or logging success', async () => {
    let acknowledge!: () => void;
    sendMail.mockReturnValue(
      new Promise<void>((resolve) => {
        acknowledge = resolve;
      }),
    );
    let completed = false;
    const delivery = driver.send(message).then(() => {
      completed = true;
    });

    await Promise.resolve();
    expect(completed).toBe(false);
    expect(log).not.toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(message);

    acknowledge();
    await delivery;
    expect(completed).toBe(true);
    expect(log).toHaveBeenCalledTimes(1);
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('propagates the original SMTP rejection without retrying in the driver', async () => {
    const rejection = new Error('Synthetic SMTP rejection');
    sendMail.mockRejectedValue(rejection);

    await expect(driver.send(message)).rejects.toBe(rejection);
    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('propagates a synchronous transport failure without logging success', async () => {
    const rejection = new Error('Synthetic transport failure');
    sendMail.mockImplementation(() => {
      throw rejection;
    });

    await expect(driver.send(message)).rejects.toBe(rejection);
    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});
