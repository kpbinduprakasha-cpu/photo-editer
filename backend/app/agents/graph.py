"""LangGraph orchestration graph for the five video generation agents."""

import logging
from typing import Literal
from langgraph.graph import END, START, StateGraph

from app.agents.compiler_fixer import run_compiler_fixer
from app.agents.image_analyser import run_image_analyser
from app.agents.renderer import run_renderer
from app.agents.script_generator import run_script_generator
from app.agents.state import VideoGenerationState
from app.agents.storyboard_writer import run_storyboard_writer

logger = logging.getLogger("fotoowl.graph")


def route_after_compilation(state: VideoGenerationState) -> Literal["renderer", "__end__"]:
    """Conditional router: route to renderer only if compilation succeeded."""
    if state.get("compilation_success", False):
        return "renderer"
    logger.warning("Compilation failed; halting workflow before renderer.")
    return END


def build_video_agent_graph() -> StateGraph:
    """Build and compile the LangGraph 5-agent state graph."""
    workflow = StateGraph(VideoGenerationState)

    # 1. Register agent nodes
    workflow.add_node("image_analyser", run_image_analyser)
    workflow.add_node("storyboard_writer", run_storyboard_writer)
    workflow.add_node("script_generator", run_script_generator)
    workflow.add_node("compiler_fixer", run_compiler_fixer)
    workflow.add_node("renderer", run_renderer)

    # 2. Sequential pipeline edges
    workflow.add_edge(START, "image_analyser")
    workflow.add_edge("image_analyser", "storyboard_writer")
    workflow.add_edge("storyboard_writer", "script_generator")
    workflow.add_edge("script_generator", "compiler_fixer")

    # 3. Conditional validation edge
    workflow.add_conditional_edges(
        "compiler_fixer",
        route_after_compilation,
        {
            "renderer": "renderer",
            END: END,
        },
    )

    workflow.add_edge("renderer", END)

    return workflow.compile()


video_agent_pipeline = build_video_agent_graph()
