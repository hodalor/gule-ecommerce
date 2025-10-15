import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

const FAQ = () => {
  const [openItems, setOpenItems] = useState(new Set());

  const toggleItem = (index) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const faqCategories = [
    {
      title: 'General Questions',
      questions: [
        {
          question: 'What is Gule Marketplace?',
          answer: 'Gule Marketplace is an online platform that connects buyers and sellers from around the world. We provide a secure, user-friendly environment where businesses can sell their products and customers can discover amazing deals from trusted sellers.'
        },
        {
          question: 'How does Gule Marketplace work?',
          answer: 'Sellers list their products on our platform, and buyers can browse, search, and purchase items. We handle the payment processing and provide tools for order management, communication, and dispute resolution.'
        },
        {
          question: 'Is it free to use Gule Marketplace?',
          answer: 'It\'s free to browse and buy products. For sellers, we charge a small commission on each sale to cover platform maintenance, payment processing, and customer support services.'
        },
        {
          question: 'How do I contact customer support?',
          answer: 'You can reach our customer support team through the Contact page, email us at support@gule.com, or call us at +1 (555) 123-4567. We\'re available Monday-Friday 9AM-6PM and Saturday 10AM-4PM.'
        }
      ]
    },
    {
      title: 'Buying on Gule',
      questions: [
        {
          question: 'How do I place an order?',
          answer: 'Simply browse our products, add items to your cart, and proceed to checkout. You\'ll need to create an account and provide shipping and payment information to complete your purchase.'
        },
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers. All payments are processed securely through encrypted connections.'
        },
        {
          question: 'How can I track my order?',
          answer: 'Once your order ships, you\'ll receive a tracking number via email. You can also track your orders by logging into your account and visiting the "My Orders" section.'
        },
        {
          question: 'What if I receive a damaged or wrong item?',
          answer: 'If you receive a damaged or incorrect item, please contact us within 48 hours of delivery. We\'ll work with the seller to resolve the issue quickly, either through a replacement, refund, or store credit.'
        },
        {
          question: 'Can I cancel my order?',
          answer: 'You can cancel your order before it ships. Once shipped, you\'ll need to wait for delivery and then initiate a return if needed. Check your order status in your account dashboard.'
        }
      ]
    },
    {
      title: 'Selling on Gule',
      questions: [
        {
          question: 'How do I become a seller?',
          answer: 'Sign up for a seller account, complete your business profile, verify your identity, and start listing products. Our team reviews new seller applications within 24-48 hours.'
        },
        {
          question: 'What can I sell on Gule?',
          answer: 'You can sell most legal products including electronics, clothing, home goods, books, and more. We have restrictions on certain items like weapons, illegal substances, and counterfeit goods. Check our seller guidelines for the complete list.'
        },
        {
          question: 'How much does it cost to sell?',
          answer: 'There\'s no upfront cost to list products. We charge a commission fee (typically 5-10% depending on category) only when you make a sale. This covers payment processing, platform maintenance, and customer support.'
        },
        {
          question: 'When do I get paid?',
          answer: 'Payments are released after the buyer confirms delivery or after 14 days (whichever comes first), minus our commission fee. Funds are transferred to your bank account within 2-3 business days.'
        },
        {
          question: 'How do I handle returns and refunds?',
          answer: 'You\'ll be notified of any return requests through your seller dashboard. You can approve or dispute returns based on your return policy. We provide guidelines to help resolve disputes fairly.'
        }
      ]
    },
    {
      title: 'Shipping & Delivery',
      questions: [
        {
          question: 'How long does shipping take?',
          answer: 'Shipping times vary by seller location and shipping method chosen. Most domestic orders arrive within 3-7 business days, while international orders may take 7-21 business days.'
        },
        {
          question: 'How much does shipping cost?',
          answer: 'Shipping costs are set by individual sellers and vary based on item size, weight, destination, and shipping speed. You\'ll see the exact shipping cost before completing your purchase.'
        },
        {
          question: 'Do you offer international shipping?',
          answer: 'Many of our sellers offer international shipping, but availability varies by seller and product. Check the product page or contact the seller directly for international shipping options.'
        },
        {
          question: 'What if my package is lost or stolen?',
          answer: 'If your package shows as delivered but you didn\'t receive it, first check with neighbors and your building management. If still missing, contact us within 7 days and we\'ll investigate with the shipping carrier.'
        }
      ]
    },
    {
      title: 'Returns & Refunds',
      questions: [
        {
          question: 'What is your return policy?',
          answer: 'We offer a 30-day return policy for most items. Products must be in original condition with all packaging and accessories. Some items like personalized products or perishables may not be returnable.'
        },
        {
          question: 'How do I return an item?',
          answer: 'Log into your account, go to "My Orders," find the item you want to return, and click "Request Return." Follow the instructions to print a return label and ship the item back.'
        },
        {
          question: 'Who pays for return shipping?',
          answer: 'Return shipping costs depend on the reason for return. If the item is defective or not as described, we cover return shipping. For other reasons like change of mind, the buyer typically pays return shipping.'
        },
        {
          question: 'How long does it take to get a refund?',
          answer: 'Once we receive and process your return, refunds are typically issued within 3-5 business days. The time for the refund to appear in your account depends on your payment method and bank.'
        }
      ]
    },
    {
      title: 'Account & Security',
      questions: [
        {
          question: 'How do I create an account?',
          answer: 'Click "Sign Up" at the top of any page, choose whether you want to buy or sell (or both), and fill out the registration form. You\'ll need to verify your email address to activate your account.'
        },
        {
          question: 'Is my personal information secure?',
          answer: 'Yes, we use industry-standard encryption and security measures to protect your personal and payment information. We never share your data with third parties without your consent.'
        },
        {
          question: 'How do I change my password?',
          answer: 'Log into your account, go to "Account Settings," and click "Change Password." You\'ll need to enter your current password and choose a new one.'
        },
        {
          question: 'What if I forget my password?',
          answer: 'Click "Forgot Password" on the login page and enter your email address. We\'ll send you a link to reset your password. The link expires after 24 hours for security.'
        },
        {
          question: 'Can I delete my account?',
          answer: 'Yes, you can delete your account by contacting customer support. Note that this action is permanent and you\'ll lose access to your order history and any pending transactions.'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-xl md:text-2xl text-primary-100 max-w-3xl mx-auto">
            Find answers to common questions about using Gule Marketplace
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Search Bar */}
        <div className="mb-12">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for answers..."
              className="w-full px-6 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pl-12"
            />
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {faqCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-primary-50 px-6 py-4 border-b border-primary-100">
                <h2 className="text-2xl font-bold text-primary-800">
                  {category.title}
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {category.questions.map((faq, questionIndex) => {
                  const itemIndex = `${categoryIndex}-${questionIndex}`;
                  const isOpen = openItems.has(itemIndex);
                  
                  return (
                    <div key={questionIndex}>
                      <button
                        onClick={() => toggleItem(itemIndex)}
                        className="w-full px-6 py-4 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900 pr-4">
                            {faq.question}
                          </h3>
                          {isOpen ? (
                            <ChevronUpIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                      
                      {isOpen && (
                        <div className="px-6 pb-4">
                          <p className="text-gray-700 leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Still Need Help Section */}
        <div className="mt-16 bg-primary-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">
            Still Need Help?
          </h2>
          <p className="text-primary-100 mb-6">
            Can't find the answer you're looking for? Our customer support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Contact Support
            </a>
            <a
              href="mailto:support@gule.com"
              className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>

        {/* Popular Topics */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Popular Help Topics
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Order Issues
              </h3>
              <p className="text-gray-600 text-sm">
                Problems with orders, tracking, or delivery
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Payment Help
              </h3>
              <p className="text-gray-600 text-sm">
                Payment methods, refunds, and billing questions
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Account Settings
              </h3>
              <p className="text-gray-600 text-sm">
                Managing your profile, password, and preferences
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;