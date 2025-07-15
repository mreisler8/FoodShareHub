
// Button Validation Utility for Testing and Debugging

export interface ButtonTestResult {
  buttonName: string;
  selector: string;
  isPresent: boolean;
  isClickable: boolean;
  hasHandler: boolean;
  errorMessage?: string;
}

export class ButtonValidator {
  static validateButton(buttonElement: HTMLElement, buttonName: string): ButtonTestResult {
    const result: ButtonTestResult = {
      buttonName,
      selector: buttonElement.tagName.toLowerCase(),
      isPresent: true,
      isClickable: !buttonElement.hasAttribute('disabled'),
      hasHandler: false,
    };

    // Check for click handlers
    const hasOnClick = buttonElement.onclick !== null;
    const hasEventListeners = buttonElement.hasAttribute('data-has-listeners');
    const hasHref = buttonElement.hasAttribute('href');
    
    result.hasHandler = hasOnClick || hasEventListeners || hasHref;

    if (!result.hasHandler) {
      result.errorMessage = 'No click handler detected';
    }

    if (!result.isClickable) {
      result.errorMessage = 'Button is disabled';
    }

    return result;
  }

  static validateAllButtons(): ButtonTestResult[] {
    const results: ButtonTestResult[] = [];
    
    // Find all interactive elements
    const buttons = document.querySelectorAll('button, [role="button"], a[href], input[type="button"], input[type="submit"]');
    
    buttons.forEach((button, index) => {
      const buttonName = button.textContent?.trim() || 
                        button.getAttribute('aria-label') || 
                        button.getAttribute('title') || 
                        `Button-${index}`;
      
      results.push(this.validateButton(button as HTMLElement, buttonName));
    });

    return results;
  }

  static logValidationResults(results: ButtonTestResult[]): void {
    console.group('🔘 Button Validation Results');
    
    const workingButtons = results.filter(r => r.isClickable && r.hasHandler);
    const brokenButtons = results.filter(r => !r.isClickable || !r.hasHandler);
    
    console.log(`✅ Working buttons: ${workingButtons.length}`);
    console.log(`❌ Broken buttons: ${brokenButtons.length}`);
    
    if (brokenButtons.length > 0) {
      console.group('❌ Broken Buttons:');
      brokenButtons.forEach(button => {
        console.warn(`${button.buttonName}: ${button.errorMessage}`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}

// Development helper - run in browser console
if (typeof window !== 'undefined') {
  (window as any).validateButtons = () => {
    const results = ButtonValidator.validateAllButtons();
    ButtonValidator.logValidationResults(results);
    return results;
  };
}
