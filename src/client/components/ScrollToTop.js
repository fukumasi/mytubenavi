import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

const ScrollToTop = ({ smooth = true, topOffset = 0, behavior = 'auto' }) => {
  const { pathname } = useLocation();
  const lastPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== lastPathname.current) {
      const scrollOptions = {
        top: topOffset,
        left: 0,
        behavior: smooth ? 'smooth' : behavior
      };

      if ('scrollBehavior' in document.documentElement.style) {
        window.scrollTo(scrollOptions);
      } else {
        // Fallback for browsers that don't support smooth scrolling
        window.scrollTo(scrollOptions.left, scrollOptions.top);
      }

      lastPathname.current = pathname;
    }
  }, [pathname, smooth, topOffset, behavior]);

  return null;
};

ScrollToTop.propTypes = {
  smooth: PropTypes.bool,
  topOffset: PropTypes.number,
  behavior: PropTypes.oneOf(['auto', 'smooth', 'instant'])
};

export default ScrollToTop;