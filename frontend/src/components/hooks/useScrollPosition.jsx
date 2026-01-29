import { useState, useEffect, useCallback } from "react";

export function useScrollPosition() {
  const [editButtonRightOffset, setEditButtonRightOffset] = useState(0);
  const [isEditButtonFixed, setIsEditButtonFixed] = useState(false);

  const calculatePositions = useCallback(() => {
    const resumeCard = document.getElementById('resume-card');
    const editButtonContainer = document.getElementById('edit-button-container');

    if (resumeCard) {
      const rect = resumeCard.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const rightOffset = windowWidth - rect.right;
      setEditButtonRightOffset(rightOffset);
    }

    if (editButtonContainer) {
      const rect = editButtonContainer.getBoundingClientRect();
      // Button becomes fixed when scrolled past 80px from top
      setIsEditButtonFixed(rect.top < 80);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      requestAnimationFrame(calculatePositions);
    };

    // Listen to the main scroll container (Layout wraps content in
    // <main id="main-scroll-container" className="overflow-auto">)
    // which is the actual scrolling element, not window.
    const mainContainer = document.getElementById('main-scroll-container');

    if (mainContainer) {
      mainContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    // Also listen to window scroll as fallback
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Initial calculation with slight delay to ensure DOM is ready
    const initialTimeout = setTimeout(calculatePositions, 100);
    const secondTimeout = setTimeout(calculatePositions, 500);

    return () => {
      if (mainContainer) {
        mainContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      clearTimeout(initialTimeout);
      clearTimeout(secondTimeout);
    };
  }, [calculatePositions]);

  return {
    editButtonRightOffset,
    isEditButtonFixed
  };
}
