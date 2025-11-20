import { useState, useEffect } from "react";

export function useScrollPosition() {
  const [editButtonRightOffset, setEditButtonRightOffset] = useState(0);
  const [isEditButtonFixed, setIsEditButtonFixed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
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
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return {
    editButtonRightOffset,
    isEditButtonFixed
  };
}