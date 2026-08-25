module Main exposing (main)

import Browser
import Gpuix
import Html exposing (Html, button, div, text)
import Html.Attributes exposing (style)
import Html.Events exposing (onClick)


type alias Model =
    { count : Int }


type Msg
    = Increment


main =
    Browser.element
        { init = init
        , update = update
        , subscriptions = subscriptions
        , view = view
        }


init : () -> ( Model, Cmd Msg )
init _ =
    ( { count = 0 }, Cmd.none )


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Increment ->
            ( { model | count = model.count + 1 }, Cmd.none )


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.none


view : Model -> Html Msg
view model =
    div
        [ style "display" "flex"
        , style "flexDirection" "column"
        , style "alignItems" "center"
        , style "justifyContent" "center"
        , style "gap" "18px"
        , style "width" "100%"
        , style "height" "100%"
        , style "padding" "32px"
        , style "backgroundColor" "#111827"
        , style "userSelect" "none"
        ]
        [ div
            [ style "color" "#f9fafb"
            , style "fontSize" "28px"
            , style "fontWeight" "700"
            ]
            [ text "Elm is driving GPUI" ]
        , div
            [ style "color" "#60a5fa"
            , style "fontSize" "48px"
            , style "fontWeight" "700"
            ]
            [ text ("Count: " ++ String.fromInt model.count), text ("Triple: " ++ String.fromInt (model.count * 3)) ]
        , button
            [ Gpuix.testId "increment"
            , onClick Increment
            , style "display" "flex"
            , style "alignItems" "center"
            , style "justifyContent" "center"
            , style "paddingTop" "12px"
            , style "paddingRight" "20px"
            , style "paddingBottom" "12px"
            , style "paddingLeft" "20px"
            , style "backgroundColor" "#2563eb"
            , style "borderRadius" "10px"
            , style "cursor" "pointer"
            ]
            [ div
                [ style "color" "#ffffff"
                , style "fontSize" "16px"
                , style "fontWeight" "600"
                ]
                [ text "Increment in Elm" ]
            ]
        , div
            [ style "color" "#9ca3af"
            , style "fontFamily" "Menlo"
            , style "fontSize" "13px"
            ]
            [ text ("Elm model = { count = " ++ String.fromInt model.count ++ " }") ]
        ]
