module Gpuix exposing (testId)

{-| GPUix-specific helpers for official Elm HTML views.

# Automation

@docs testId
-}

import Html
import Html.Attributes


{-| Mark an element with the stable automation identifier exposed by GPUix.
-}
testId : String -> Html.Attribute msg
testId value =
    Html.Attributes.attribute "data-gpuix-test-id" value
