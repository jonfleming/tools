import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Conversation from './Conversation';

const mockConversationItems = [
  { item_id: 1, role: 'user', content: 'Hello!' },
  { item_id: 2, role: 'bot', content: 'Hi there!' },
];

describe('Conversation Component', () => {
  it('renders a message when there are no conversation items', () => {
    const { debug } = render(<Conversation conversationItems={[]} />);
    debug(); // This will log the rendered output to the console
    expect(screen.getByText('Waiting for the conversation to start...')).toBeInTheDocument();
  });

  it('renders conversation items correctly', () => {
    const { debug } = render(<Conversation conversationItems={mockConversationItems} />);
    debug(); // This will log the rendered output to the console
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('toggles expansion of a conversation item on click', () => {
    const { debug } = render(<Conversation conversationItems={mockConversationItems} />);
    debug(); // This will log the rendered output to the console
    const userMessage = screen.getByText('Hello!');
    fireEvent.click(userMessage);
    // Add assertions for expanded state if applicable
  });
});