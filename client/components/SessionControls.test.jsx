import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SessionControls from './SessionControls';

describe('SessionControls', () => {
  it('renders SessionStopped when session is inactive', () => {
    const startSessionMock = jest.fn();

    render(
      <SessionControls
        startSession={startSessionMock}
        isSessionActive={false}
      />
    );

    const button = screen.getByText(/start session/i);
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(startSessionMock).toHaveBeenCalled();
  });

  it('renders SessionActive when session is active', () => {
    const stopSessionMock = jest.fn();
    const sendTextMessageMock = jest.fn();

    render(
      <SessionControls
        stopSession={stopSessionMock}
        sendTextMessage={sendTextMessageMock}
        isSessionActive={true}
      />
    );

    const input = screen.getByPlaceholderText(/send a text message/i);
    const sendButton = screen.getByText(/send text/i);
    const disconnectButton = screen.getByText(/disconnect/i);

    expect(input).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
    expect(disconnectButton).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);
    expect(sendTextMessageMock).toHaveBeenCalledWith('Hello');

    fireEvent.click(disconnectButton);
    expect(stopSessionMock).toHaveBeenCalled();
  });
});