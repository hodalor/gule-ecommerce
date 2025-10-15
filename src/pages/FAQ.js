import React, { useState } from 'react';

const FAQ = () => {
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (index) => {
    setOpenItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const faqCategories = [
    {
      title: "General Questions",
      items: [
        {
          question: "What is Gule?",
          answer: "Gule is an online marketplace that connects buyers and sellers from around the world. We provide a secure platform for businesses of all sizes to sell their products and for customers to discover amazing deals."
        },
        {
          question: "How do I create an account?",
          answer: "Creating an account is easy! Click on the 'Sign Up' button in the top right corner, fill out the required information, and verify your email address. You can sign up as either a buyer or seller."
        },
        {
          question: "Is Gule free to use?",
          answer: "Yes, creating an account and browsing products is completely free. Sellers pay a small commission on successful sales, and there are no listing fees for basic accounts."
        },
        {
          question: "How do I contact customer support?",
          answer: "You can reach our customer support team through our Contact page, live chat feature, or by emailing support@gule.com. We're available Monday-Friday 9AM-6PM PST."
        }
      ]
    },
    {
      title: "Buying on Gule",
      items: [
        {
          question: "How do I place an order?",
          answer: "Browse products, add items to your cart, proceed to checkout, enter your shipping and payment information, and confirm your order. You'll receive an order confirmation email immediately."
        },
        {
          question: "What payment methods are accepted?",
          answer: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, Apple Pay, Google Pay, and bank transfers. All payments are processed securely."
        },
        {
          question: "How can I track my order?",
          answer: "Once your order ships, you'll receive a tracking number via email. You can also track orders by logging into your account and visiting 'My Orders' section."
        },
        {
          question: "What if I'm not satisfied with my purchase?",
          answer: "We offer a 30-day return policy for most items. Contact the seller first, and if you can't resolve the issue, our customer support team will help you process a return or refund."
        },
        {
          question: "Are there shipping costs?",
          answer: "Shipping costs vary by seller and location. Many sellers offer free shipping on orders over a certain amount. You'll see all shipping costs before completing your purchase."
        }
      ]
    },
    {
      title: "Selling on Gule",
      items: [
        {
          question: "How do I become a seller?",
          answer: "Click 'Become a Seller' on our homepage, complete the registration process, verify your identity and business information, and start listing your products. The process typically takes 1-3 business days."
        },
        {
          question: "What are the seller fees?",
          answer: "We charge a small commission on successful sales (typically 3-5% depending on category). There are no monthly fees or listing fees for basic seller accounts."
        },
        {
          question: "How do I list a product?",
          answer: "Log into your seller dashboard, click 'Add Product', fill out the product details including photos, description, and pricing, then publish your listing. Products are typically live within a few hours."
        },
        {
          question: "When do I get paid?",
          answer: "Payments are processed weekly and deposited into your registered bank account. You can view your earnings and payment history in your seller dashboard."
        },
        {
          question: "Can I sell internationally?",
          answer: "Yes! You can choose to sell domestically, internationally, or both. You'll need to set up international shipping options and comply with relevant regulations."
        }
      ]
    },
    {
      title: "Security & Privacy",
      items: [
        {
          question: "Is my personal information safe?",
          answer: "Yes, we use industry-standard encryption and security measures to protect your personal and financial information. We never share your data with third parties without your consent."
        },
        {
          question: "How do you handle disputes?",
          answer: "We have a comprehensive dispute resolution system. If you have an issue with a transaction, contact our support team and we'll mediate between buyer and seller to find a fair solution."
        },
        {
          question: "What if I suspect fraudulent activity?",
          answer: "Report any suspicious activity immediately through our security center or contact support. We have advanced fraud detection systems and take all reports seriously."
        },
        {
          question: "How do you verify sellers?",
          answer: "All sellers go through an identity verification process including business registration checks, bank account verification, and ongoing performance monitoring."
        }
      ]
    },
    {
      title: "Technical Support",
      items: [
        {
          question: "The website isn't working properly. What should I do?",
          answer: "Try refreshing the page, clearing your browser cache, or using a different browser. If problems persist, contact our technical support team with details about your device and browser."
        },
        {
          question: "Do you have a mobile app?",
          answer: "Yes! Our mobile app is available for both iOS and Android devices. You can download it from the App Store or Google Play Store."
        },
        {
          question: "Can I use Gule on my tablet?",
          answer: "Absolutely! Our website is fully responsive and works great on tablets, smartphones, and desktop computers."
        },
        {
          question: "How do I reset my password?",
          answer: "Click 'Forgot Password' on the login page, enter your email address, and we'll send you a password reset link. Follow the instructions in the email to create a new password."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
              Frequently Asked Questions
            </h1>
            <p className="mt-4 text-xl text-gray-500">
              Find answers to common questions about using Gule
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search for answers..."
              className="ml-3 block w-full border-0 focus:ring-0 focus:outline-none text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="space-y-12">
          {faqCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100">
                <h2 className="text-xl font-semibold text-indigo-900">{category.title}</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {category.items.map((item, itemIndex) => {
                  const globalIndex = `${categoryIndex}-${itemIndex}`;
                  const isOpen = openItems[globalIndex];
                  
                  return (
                    <div key={itemIndex}>
                      <button
                        className="w-full px-6 py-4 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                        onClick={() => toggleItem(globalIndex)}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-gray-900 pr-4">
                            {item.question}
                          </h3>
                          <svg
                            className={`h-5 w-5 text-gray-500 transform transition-transform duration-200 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      
                      {isOpen && (
                        <div className="px-6 pb-4">
                          <p className="text-gray-700 leading-relaxed">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-16 bg-indigo-600 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Still have questions?
          </h2>
          <p className="text-indigo-100 mb-6">
            Can't find the answer you're looking for? Our customer support team is here to help.
          </p>
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <a
              href="/contact"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Contact Support
            </a>
            <a
              href="mailto:support@gule.com"
              className="inline-flex items-center px-6 py-3 border border-white text-base font-medium rounded-md text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
            >
              Email Us
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="mx-auto h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Buyer Guide</h3>
            <p className="text-gray-600 text-sm mb-4">Learn how to shop safely and get the best deals</p>
            <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
              Read Guide →
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="mx-auto h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Seller Guide</h3>
            <p className="text-gray-600 text-sm mb-4">Everything you need to know about selling on Gule</p>
            <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
              Read Guide →
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="mx-auto h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Safety Center</h3>
            <p className="text-gray-600 text-sm mb-4">Tips for safe and secure transactions</p>
            <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
              Learn More →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;