/**
 * @name React dangerouslySetInnerHTML XSS
 * @description Detects potential XSS vulnerabilities from using dangerouslySetInnerHTML with untrusted data
 * @kind path-problem
 * @problem.severity error
 * @id js/react-dangerously-set-inner-html-xss
 * @tags security
 *       external/cwe/cwe-79
 *       react
 */

import javascript
import semmle.javascript.security.dataflow.RemoteFlowSources
import semmle.javascript.frameworks.React

/**
 * A taint-tracking configuration for React dangerouslySetInnerHTML XSS vulnerabilities.
 */
class DangerouslySetInnerHTMLConfig extends TaintTracking::Configuration {
  DangerouslySetInnerHTMLConfig() { this = "DangerouslySetInnerHTMLConfig" }

  override predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource
  }

  override predicate isSink(DataFlow::Node sink) {
    exists(ReactElementDefinition e |
      e.getAPropertyWrite("dangerouslySetInnerHTML").getRhs() = sink.asExpr()
    )
  }
}

from DangerouslySetInnerHTMLConfig cfg, DataFlow::PathNode source, DataFlow::PathNode sink
where cfg.hasFlowPath(source, sink)
select sink.getNode(), source, sink, 
  "Potentially dangerous HTML injection from $@.", 
  source.getNode(), "user input"