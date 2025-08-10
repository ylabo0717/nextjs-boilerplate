/**
 * @name Dangerous HTML injection in React
 * @description Using dangerouslySetInnerHTML with user input can lead to XSS vulnerabilities
 * @kind problem
 * @problem.severity warning
 * @id js/react-dangerous-html
 * @tags security
 *       react
 *       xss
 */

import javascript
import semmle.javascript.security.dataflow.DomBasedXssQuery

from DataFlow::Node source, DataFlow::Node sink
where
  exists(ReactElementDefinition e |
    e.getAPropertyWrite("dangerouslySetInnerHTML").getRhs() = sink.asExpr() and
    source.asExpr() instanceof RemoteFlowSource
  )
select sink, "Potentially dangerous HTML injection from $@.", source, "user input"