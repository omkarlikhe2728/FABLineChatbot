class TemplateService {
  getMainMenuTemplate() {
    return {
      type: 'template',
      altText: 'Main Menu',
      template: {
        type: 'buttons',
        text: '🏦 FAB Bank Services\n\nHow can I help you?',
        actions: [
          {
            type: 'postback',
            label: '💳 Check Balance',
            data: 'action=check_balance',
          },
          {
            type: 'postback',
            label: '💰 Card Services',
            data: 'action=card_services',
          },
          {
            type: 'postback',
            label: ' Exit',
            data: 'action=end_session',
          },
        ],
      },
    };
  }

  getBalanceFlexTemplate(data) {
    return {
      type: 'flex',
      altText: `Balance: $${data.balance}`,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '💰 Account Balance',
              weight: 'bold',
              size: 'xl',
              margin: 'md',
            },
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              spacing: 'sm',
              contents: [
                this.createBalanceRow('Name:', data.customerName),
                this.createBalanceRow('Account:', data.accountNumber),
                this.createBalanceRow('Type:', data.accountType),
                {
                  type: 'box',
                  layout: 'baseline',
                  contents: [
                    {
                      type: 'text',
                      text: 'Balance:',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 2,
                      weight: 'bold',
                    },
                    {
                      type: 'text',
                      text: `$${parseFloat(data.balance).toFixed(2)}`,
                      wrap: true,
                      color: '#27ae60',
                      size: 'lg',
                      flex: 3,
                      weight: 'bold',
                    },
                  ],
                },
              ],
            },
            {
              type: 'separator',
              margin: 'md',
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'link',
              height: 'sm',
              action: {
                type: 'postback',
                label: '📊 Mini Statement',
                data: 'action=view_mini_statement',
              },
            },
            {
              type: 'button',
              style: 'link',
              height: 'sm',
              action: {
                type: 'postback',
                label: '🏠 Back to Menu',
                data: 'action=back_to_menu',
              },
            },
          ],
        },
      },
    };
  }

  getCardListTemplate(cards) {
    return {
      type: 'flex',
      altText: `Your ${cards.length} card(s)`,
      contents: {
        type: 'carousel',
        contents: cards.slice(0, 10).map((card) => this.createCardBubble(card)),
      },
    };
  }

  createCardBubble(card) {
    const statusColor = card.status === 'ACTIVE' ? '#27ae60' : '#e74c3c';

    return {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: card.cardType,
            weight: 'bold',
            size: 'lg',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'baseline',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: 'Card:',
                color: '#aaaaaa',
                size: 'sm',
                flex: 1,
              },
              {
                type: 'text',
                text: card.cardNumber,
                wrap: true,
                color: '#666666',
                size: 'sm',
                flex: 2,
              },
            ],
          },
          {
            type: 'box',
            layout: 'baseline',
            margin: 'sm',
            contents: [
              {
                type: 'text',
                text: 'Expiry:',
                color: '#aaaaaa',
                size: 'sm',
                flex: 1,
              },
              {
                type: 'text',
                text: card.expiryDate
                  ? new Date(card.expiryDate).toLocaleDateString('en-IN')
                  : 'N/A',
                wrap: true,
                color: '#666666',
                size: 'sm',
                flex: 2,
              },
            ],
          },
          {
            type: 'box',
            layout: 'baseline',
            margin: 'sm',
            contents: [
              {
                type: 'text',
                text: 'Status:',
                color: '#aaaaaa',
                size: 'sm',
                flex: 1,
              },
              {
                type: 'text',
                text: card.status,
                wrap: true,
                color: statusColor,
                size: 'sm',
                flex: 2,
                weight: 'bold',
              },
            ],
          },
        ],
      },
    };
  }

  createBalanceRow(label, value) {
    return {
      type: 'box',
      layout: 'baseline',
      contents: [
        {
          type: 'text',
          text: label,
          color: '#aaaaaa',
          size: 'sm',
          flex: 2,
        },
        {
          type: 'text',
          text: value,
          wrap: true,
          color: '#666666',
          size: 'sm',
          flex: 3,
        },
      ],
    };
  }

  getConfirmTemplate(title, message, confirmLabel, confirmAction, cancelLabel) {
    return {
      type: 'template',
      altText: title,
      template: {
        type: 'buttons',
        text: message,
        actions: [
          {
            type: 'postback',
            label: confirmLabel,
            data: confirmAction,
          },
          {
            type: 'postback',
            label: cancelLabel,
            data: 'action=back_to_menu',
          },
        ],
      },
    };
  }

  getSuccessTemplate(title, message) {
    return {
      type: 'text',
      text: ` ${title}\n\n${message}`,
    };
  }

  getErrorTemplate(title, message) {
    return {
      type: 'text',
      text: ` ${title}\n\n${message}`,
    };
  }

  getAgentConnectingMessage() {
    return {
      type: 'text',
      text: '💬 Please wait while we connect you with an agent.\n\nA FAB Bank team member will assist you shortly. You can also reach us at:\n📞 +1 800 123 4567\n📧 support@fabbank.com\n\n⏰ Chat available 24/7',
    };
  }

  getLiveChatEndedMessage() {
    return {
      type: 'text',
      text: '👋 Your live chat session has ended. Thank you for connecting with us!\n\nWe look forward to serving you again.',
    };
  }

  getEndLiveChatButtonTemplate() {
    return {
      type: 'template',
      altText: 'End Live Chat',
      template: {
        type: 'buttons',
        text: '💬 You are currently chatting with a FAB Bank agent.\n\nWould you like to end the chat?',
        actions: [
          {
            type: 'postback',
            label: '🚪 End Chat',
            data: 'action=end_live_chat',
            displayText: '🚪 End Chat',
          },
          {
            type: 'postback',
            label: '💬 Continue',
            data: 'action=main_menu',
            displayText: '💬 Continue Chatting',
          },
        ],
      },
    };
  }
}

module.exports = new TemplateService();
