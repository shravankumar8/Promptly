import React from 'react';
import Hero from '../Components /LandingPage/hero';
import Hero2 from '../Components /LandingPage/hero2';
import Hero3 from '../Components /LandingPage/hero3';
import Hero4 from '../Components /LandingPage/hero4';
import Hero5 from '../Components /LandingPage/hero5';

const LandingPage: React.FC = () => {
   return (
     <div>
       <Hero />
       <Hero3 />
       <Hero4 />
       <Hero5 />
     </div>
   );
};

export default LandingPage;