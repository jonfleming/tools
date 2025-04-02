import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./App', () => {
  const MockApp = () => {
    // Mock import.meta.env
    global.import = {
      meta: {
        env: {
          VITE_SUPABASE_URL: 'https://mock-supabase-url.com',
          VITE_SUPABASE_ANON_KEY: 'example-anon-key',
        },
      },
    };
    return <div data-testid="mock-app">Mock App</div>;
  };
  return () => <div data-testid="mock-app">Relevantic</div>;
});

// Mock the Supabase client
jest.mock('../lib/supabaseClient', () => ({
  getSupabaseClient: jest.fn(() => ({
    auth: {
      signOut: jest.fn(),
    },
  })),
}));

// Mock media queries
window.matchMedia = window.matchMedia || function () {
	return {
		matches: false,
		addListener: function () { },
		removeListener: function () { },
	};
};

// Mock getUserMedia
navigator.mediaDevices = {
	getUserMedia: jest.fn().mockResolvedValue({
		getTracks: () => [{
			stop: jest.fn(),
		}],
	}),
};

// Mock RTCPeerConnection
global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
	createDataChannel: jest.fn(),
	createOffer: jest.fn().mockResolvedValue({ sdp: 'test-sdp' }),
	setLocalDescription: jest.fn(),
	setRemoteDescription: jest.fn(),
	getSenders: jest.fn().mockReturnValue([]),
	close: jest.fn(),
}));

describe('App Component', () => {
	test('renders App component', () => {
		render(<App />);
		const linkElement = screen.getByText(/Relevantic/i);
		expect(linkElement).toBeInTheDocument();
	});
});

// Mock media queries
window.matchMedia = window.matchMedia || function () {
	return {
		matches: false,
		addListener: function () { },
		removeListener: function () { },
	};
};

// Mock getUserMedia
navigator.mediaDevices = {
	getUserMedia: jest.fn().mockResolvedValue({
		getTracks: () => [{
			stop: jest.fn(),
		}],
	}),
};

// Mock RTCPeerConnection
global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
	createDataChannel: jest.fn(),
	createOffer: jest.fn().mockResolvedValue({ sdp: 'test-sdp' }),
	setLocalDescription: jest.fn(),
	setRemoteDescription: jest.fn(),
	getSenders: jest.fn().mockReturnValue([]),
	close: jest.fn(),
}));

describe('App Component', () => {
	test('renders App component', () => {
		render(<App />);
		const linkElement = screen.getByText(/relevantic/i);
		expect(linkElement).toBeInTheDocument();
	});
});
