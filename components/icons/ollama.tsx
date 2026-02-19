import type { SVGProps } from "react";

export function OllamaIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 1024 1024"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path d="M512 96C334 96 192 238 192 416c0 108 54 204 136 262v154c0 26 22 48 48 48h272c26 0 48-22 48-48V678c82-58 136-154 136-262C832 238 690 96 512 96zm-96 480c-36 0-64-28-64-64s28-64 64-64 64 28 64 64-28 64-64 64zm192 0c-36 0-64-28-64-64s28-64 64-64 64 28 64 64-28 64-64 64z" />
        </svg>
    );
}
