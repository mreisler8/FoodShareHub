
// QA Validation Utilities for Development Testing

export interface QAValidationResult {
  category: string;
  test: string;
  passed: boolean;
  message: string;
}

export class QAValidator {
  static validateUI(): QAValidationResult[] {
    const results: QAValidationResult[] = [];

    // Check for proper logo display
    const logoElements = document.querySelectorAll('img[alt*="Circles Logo"]');
    results.push({
      category: 'UI',
      test: 'Logo Display',
      passed: logoElements.length > 0,
      message: logoElements.length > 0 ? 'Logo found in DOM' : 'No logo elements found'
    });

    // Check for header consistency
    const headers = document.querySelectorAll('header');
    results.push({
      category: 'UI',
      test: 'Header Present',
      passed: headers.length > 0,
      message: headers.length > 0 ? `${headers.length} header(s) found` : 'No headers found'
    });

    // Check for navigation
    const navElements = document.querySelectorAll('[role="navigation"], nav');
    results.push({
      category: 'Navigation',
      test: 'Navigation Elements',
      passed: navElements.length > 0,
      message: navElements.length > 0 ? `${navElements.length} nav element(s) found` : 'No navigation found'
    });

    return results;
  }

  static validateAccessibility(): QAValidationResult[] {
    const results: QAValidationResult[] = [];

    // Check for buttons without accessible labels
    const buttons = document.querySelectorAll('button');
    let accessibleButtons = 0;
    
    buttons.forEach(button => {
      const hasLabel = button.getAttribute('aria-label') || 
                      button.getAttribute('title') || 
                      button.textContent?.trim();
      if (hasLabel) accessibleButtons++;
    });

    results.push({
      category: 'Accessibility',
      test: 'Button Labels',
      passed: accessibleButtons === buttons.length,
      message: `${accessibleButtons}/${buttons.length} buttons have accessible labels`
    });

    // Check for proper heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    results.push({
      category: 'Accessibility',
      test: 'Heading Structure',
      passed: headings.length > 0,
      message: `${headings.length} heading elements found`
    });

    return results;
  }

  static runAllValidations(): QAValidationResult[] {
    return [
      ...this.validateUI(),
      ...this.validateAccessibility()
    ];
  }

  static logResults(results: QAValidationResult[]): void {
    console.group('🔍 QA Validation Results');
    
    const passed = results.filter(r => r.passed);
    const failed = results.filter(r => !r.passed);
    
    console.log(`✅ Passed: ${passed.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    
    if (failed.length > 0) {
      console.group('❌ Failed Tests:');
      failed.forEach(result => {
        console.warn(`${result.category} - ${result.test}: ${result.message}`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}

// Development helper
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).runQA = () => {
    const results = QAValidator.runAllValidations();
    QAValidator.logResults(results);
    return results;
  };
}
