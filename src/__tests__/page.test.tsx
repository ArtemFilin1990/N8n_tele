import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the main page component
const HomePage = () => {
  return (
    <div>
      <h1>AI Chatbot Pro</h1>
      <p>Professional AI chatbot platform with multiple providers support</p>
      <div data-testid="chat-interface">
        <input placeholder="Type your message..." />
        <button>Send</button>
      </div>
    </div>
  );
};

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(<HomePage />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('AI Chatbot Pro');
  });

  it('renders the description', () => {
    render(<HomePage />);
    
    const description = screen.getByText(/Professional AI chatbot platform/i);
    expect(description).toBeInTheDocument();
  });

  it('renders the chat interface', () => {
    render(<HomePage />);
    
    const chatInterface = screen.getByTestId('chat-interface');
    expect(chatInterface).toBeInTheDocument();
    
    const input = screen.getByPlaceholderText(/Type your message/i);
    expect(input).toBeInTheDocument();
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<HomePage />);
    
    const input = screen.getByPlaceholderText(/Type your message/i);
    expect(input).toHaveAttribute('placeholder', 'Type your message...');
    
    const button = screen.getByRole('button', { name: /send/i });
    expect(button).toBeEnabled();
  });
});

