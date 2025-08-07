// src/utils/devtools.js

/**
 * Checks if the browser's developer tools are likely open.
 * This is a heuristic and not 100% foolproof, but it catches the most common cases.
 * 
 * @returns {boolean} - True if developer tools are likely open, false otherwise.
 */
export function areDevToolsOpen() {
  const threshold = 160; // A sensible threshold in pixels

  // Check by comparing inner and outer window dimensions
  const widthMismatch = window.outerWidth - window.innerWidth > threshold;
  const heightMismatch = window.outerHeight - window.innerHeight > threshold;

  if (widthMismatch || heightMismatch) {
    return true;
  }

  // A more advanced check: try to log an object with a custom getter.
  // The dev tools will often inspect this object, triggering the getter.
  let devtoolsOpen = false;
  const element = new Image();
  
  Object.defineProperty(element, 'id', {
    get: function() {
      devtoolsOpen = true;
      // You can add a debugger statement here for more aggressive detection,
      // but it can be disruptive.
      // debugger; 
    }
  });

  // This will only trigger the getter if dev tools are open and inspecting the console.
  console.log(element);
  console.clear(); // Clean up the console to be less intrusive

  return devtoolsOpen;
}