import React from 'react';
import { Outlet } from 'react-router-dom';
import AlumniBottomTabBar from './AlumniBottomTabBar';

export default function AlumniLayout() {
  return (
    <div className="dark min-h-screen bg-background text-foreground w-full">
      <div className="w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 relative">
        <Outlet />
      </div>
      <AlumniBottomTabBar />
    </div>
  );
}
