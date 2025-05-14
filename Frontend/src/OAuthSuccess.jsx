import Threads from './components/Threads';
import { Link } from 'react-router';
import BlurText from './components/BlurText'



export default function OAuthSuccess() {

  const handleAnimationComplete = () => {
  console.log('Animation completed!');
};
  return (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }} className="flex align-middle justify-center p-10 w-[100vw] h-[100vh] bg-black">
  <Threads
    amplitude={1}
    distance={0}
    enableMouseInteraction={true}
  />
  <div className="absolute text-white top-[20%] w-full flex flex-col items-center text-center">
  <BlurText
    text="Automate your Life!"
    delay={350}
    animateBy="words"
    direction="top"
    onAnimationComplete={handleAnimationComplete}
    className="text-8xl mb-8 font-sans"
  />
  <div className="text-center text-2xl">
    Your personal assistant is ready!
    <br></br>
    <Link to={'/'} className="text-blue-400 underline ml-2">Click here</Link>
  </div>
</div>

    </div>
  );
}
