import React from 'react';

const About = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              About Gule
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Connecting buyers and sellers in a trusted marketplace ecosystem
            </p>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Our Mission</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Empowering Commerce for Everyone
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              We believe in creating opportunities for businesses of all sizes to thrive in the digital marketplace. 
              Our platform connects passionate sellers with discerning buyers, fostering a community built on trust, 
              quality, and exceptional service.
            </p>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center mb-12">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Our Values</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              What Drives Us
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Trust & Security</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  We prioritize the security of every transaction and maintain the highest standards of trust between all parties.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Innovation</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  We continuously evolve our platform with cutting-edge technology to enhance user experience.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Community</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  We foster a supportive community where sellers and buyers can grow together and succeed.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Quality</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  We maintain rigorous quality standards to ensure every product and service meets our customers' expectations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Story Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Our Story
              </h2>
              <p className="mt-3 text-lg text-gray-500">
                Founded in 2020, Gule started as a simple idea: to create a marketplace where quality products 
                meet passionate customers. What began as a small platform has grown into a thriving ecosystem 
                that serves thousands of sellers and millions of customers worldwide.
              </p>
              <p className="mt-3 text-lg text-gray-500">
                Our journey has been driven by the belief that commerce should be accessible, transparent, 
                and beneficial for everyone involved. We've built our platform with the seller and buyer 
                experience at the forefront, ensuring that every interaction is smooth, secure, and satisfying.
              </p>
            </div>
            <div className="mt-8 lg:mt-0">
              <div className="aspect-w-5 aspect-h-3 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                  <div className="text-white text-center">
                    <svg className="mx-auto h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="mt-4 text-xl font-semibold">Building the Future of Commerce</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-indigo-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Our Impact
            </h2>
            <p className="mt-4 text-xl text-indigo-200">
              Numbers that reflect our commitment to excellence
            </p>
          </div>
          <div className="mt-10">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-4xl font-extrabold text-white">10K+</div>
                <div className="mt-2 text-base text-indigo-200">Active Sellers</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-extrabold text-white">1M+</div>
                <div className="mt-2 text-base text-indigo-200">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-extrabold text-white">500K+</div>
                <div className="mt-2 text-base text-indigo-200">Products Listed</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-extrabold text-white">99.9%</div>
                <div className="mt-2 text-base text-indigo-200">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Meet Our Team
            </h2>
            <p className="mt-4 text-xl text-gray-500">
              The passionate people behind Gule
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'Sarah Johnson', role: 'CEO & Founder', image: 'SJ' },
              { name: 'Michael Chen', role: 'CTO', image: 'MC' },
              { name: 'Emily Rodriguez', role: 'Head of Operations', image: 'ER' },
            ].map((member) => (
              <div key={member.name} className="text-center">
                <div className="mx-auto h-32 w-32 rounded-full bg-indigo-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{member.image}</span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900">{member.name}</h3>
                  <p className="text-base text-gray-500">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;