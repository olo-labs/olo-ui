export interface ComingSoonProps {

  title: string

  description?: string

}



const DEFAULT_DESCRIPTION =

  'This area will provide execution monitoring, observability, extensions, and administration features as they ship.'



export function ComingSoon({ title, description = DEFAULT_DESCRIPTION }: ComingSoonProps) {

  return (

    <div className="coming-soon">

      <p className="coming-soon-badge">Coming Soon</p>

      <h2 className="coming-soon-title">{title}</h2>

      <p className="coming-soon-description">{description}</p>

    </div>

  )

}


